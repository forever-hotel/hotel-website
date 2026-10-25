import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { BookingRepository } from '../database/repositories/booking.repository';
import { BookingChangeEmailService } from './booking-change-email.service';
import { BookingManagementRepository } from './booking-management.repository';
import type {
  ManagedBooking,
  ManagementEvent,
} from './booking-management.repository';
import { BookingChangeQuoteDto } from './dto/booking-management.dto';
import {
  managementCutoff,
  managementPolicy,
  PROJECT_MANAGEMENT_POLICY,
  requireBeforeCutoff,
} from './management-policy';
import type { ManagementPolicy } from './management-policy';
import { calculateRoomCharge } from './room-charge';
import { calculateQuotePricing } from './quote-pricing';
import type { QuotePricingPolicy } from './quote-pricing';
import { readQuote, signQuote } from './quote-token';

const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const revision = (booking: ManagedBooking) =>
  booking.priceSnapshot.management?.revision || 0;
const events = (booking: ManagedBooking) =>
  booking.priceSnapshot.management?.events || [];
const binding = (booking: ManagedBooking) =>
  hash({
    room: booking.roomTypeId,
    assignment: booking.roomNumber,
    from: booking.checkInDate,
    to: booking.checkOutDate,
    guests: booking.numberOfGuests,
    requests: booking.specialRequests,
    status: booking.status,
    total: booking.totalAmount,
    paid: booking.paidAmount,
    revision: revision(booking),
  });

export function managementSummary(booking: ManagedBooking) {
  const cancelled = booking.status === 'CANCELLED';
  const refundAmount = Math.max(
    0,
    booking.paidAmount - (cancelled ? 0 : booking.totalAmount),
  );
  return {
    bookingId: booking.bookingId,
    roomTypeId: booking.roomTypeId,
    status: booking.status,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    numberOfGuests: booking.numberOfGuests,
    specialRequests: booking.specialRequests,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
    paidAmount: booking.paidAmount,
    balanceAmount: cancelled
      ? 0
      : Math.max(0, booking.totalAmount - booking.paidAmount),
    refundAmount,
    refundStatus:
      refundAmount > 0
        ? ('PENDING' as const)
        : booking.refundedAmount
          ? ('REFUNDED' as const)
          : null,
    revision: revision(booking),
  };
}

@Injectable()
export class BookingManagementService {
  constructor(
    private readonly repository: BookingManagementRepository,
    private readonly inventory: BookingRepository,
    private readonly config: ConfigService,
    private readonly email: BookingChangeEmailService,
  ) {}
  private policy() {
    return managementPolicy(
      this.config.get<string>('BOOKING_MANAGEMENT_POLICY') ||
        (this.config.get<string>('NODE_ENV') === 'production'
          ? undefined
          : JSON.stringify(PROJECT_MANAGEMENT_POLICY)),
    );
  }
  private secret() {
    const secret = this.config.get<string>('jwt.secret') || '';
    if (Buffer.byteLength(secret) < 32)
      throw new ServiceUnavailableException(
        'Booking quote signing is unavailable.',
      );
    // Separate signing domain: management previews cannot create new reservations.
    return createHmac('sha256', secret)
      .update('hw-booking-management-v1')
      .digest('hex');
  }
  private eligible(
    booking: ManagedBooking,
    now: Date,
    policy: ManagementPolicy,
  ) {
    if (
      booking.status !== 'CONFIRMED' ||
      booking.source !== 'WEBSITE' ||
      booking.currency !== 'LKR'
    )
      throw new ConflictException({
        error: 'BOOKING_NOT_ELIGIBLE',
        message:
          'Only confirmed website bookings in LKR can be managed online. Contact the hotel.',
      });
    const payment = booking.priceSnapshot.payment as
      { refundRequired?: boolean; reviewRequired?: boolean } | undefined;
    if (
      payment?.refundRequired ||
      payment?.reviewRequired ||
      events(booking).length >= 50 ||
      (revision(booking) > 0 &&
        (managementSummary(booking).refundAmount > 0 ||
          managementSummary(booking).balanceAmount > 0))
    )
      throw new ConflictException({
        error: 'SETTLEMENT_REVIEW_REQUIRED',
        message:
          'The hotel must resolve the outstanding payment/refund review before another change.',
      });
    requireBeforeCutoff(booking.checkInDate, now, policy);
  }

  options(guestId: string, id: string) {
    return this.run(() =>
      this.repository.locked(
        id,
        guestId,
        undefined,
        (_manager, booking, now) => {
          const summary = {
            ...managementSummary(booking),
            changeEmailStatus: events(booking).at(-1)?.email.state || null,
          };
          try {
            const policy = this.policy();
            this.eligible(booking, now, policy);
            return {
              ...summary,
              eligible: true,
              cutoff: managementCutoff(
                booking.checkInDate,
                policy,
              ).toISOString(),
              timeZone: 'Asia/Colombo',
              checkInTime: policy.checkInTime,
              policyVersion: policy.version,
              modificationSettlement: policy.modificationSettlement,
              cancellationRefund: policy.cancellationRefund,
            };
          } catch (error) {
            if (!(error instanceof HttpException)) throw error;
            return { ...summary, eligible: false, reason: error.getResponse() };
          }
        },
      ),
    );
  }

  quote(guestId: string, id: string, input: BookingChangeQuoteDto) {
    return this.run(() =>
      this.repository.locked(
        id,
        guestId,
        input.roomTypeId,
        async (manager, booking, now) => {
          const policy = this.policy();
          this.eligible(booking, now, policy);
          requireBeforeCutoff(input.checkInDate, now, policy);
          const rate = await this.inventory.rate(manager, input.roomTypeId);
          if (!rate) throw new BadRequestException('Room type not found.');
          const roomCharge = calculateRoomCharge(
            input,
            rate.nightlyRate,
            rate.maxGuests,
          );
          let pricing: ReturnType<typeof calculateQuotePricing>;
          try {
            pricing = calculateQuotePricing(
              roomCharge.subtotal,
              JSON.parse(
                this.config.get<string>('BOOKING_PRICING_POLICY') || '',
              ) as QuotePricingPolicy,
            );
          } catch {
            throw new ServiceUnavailableException(
              'The hotel pricing policy is unavailable.',
            );
          }
          this.checkSettlement(booking, pricing.totalAmount, policy);
          if ((await this.inventory.available(manager, input, id)) < 1)
            throw new ConflictException({
              error: 'ROOM_UNAVAILABLE',
              message: 'No room is available for the requested dates.',
            });
          const quoteId = randomUUID();
          const expiresAt = new Date(now.getTime() + 10 * 60000).toISOString();
          const quotePricing = {
            ...pricing,
            nights: roomCharge.nights,
            nightlyRate: roomCharge.nightlyRate,
            roomLineItems: roomCharge.lineItems,
            managementBookingId: id,
            managementBinding: binding(booking),
            managementPolicy: hash(policy),
          };
          // Undefined specialRequests preserves the current text; empty string clears it.
          const normalized = {
            roomTypeId: input.roomTypeId,
            checkInDate: input.checkInDate,
            checkOutDate: input.checkOutDate,
            numberOfGuests: input.numberOfGuests,
            specialRequests:
              input.specialRequests === undefined
                ? booking.specialRequests || ''
                : input.specialRequests.trim(),
          };
          return {
            bookingId: id,
            quoteId,
            ...normalized,
            ...pricing,
            nights: roomCharge.nights,
            paidAmount: booking.paidAmount,
            balanceAmount: Math.max(
              0,
              pricing.totalAmount - booking.paidAmount,
            ),
            refundAmount: Math.max(0, booking.paidAmount - pricing.totalAmount),
            settlementMode: policy.modificationSettlement,
            revision: revision(booking),
            expiresAt,
            quoteToken: signQuote(
              {
                quoteId,
                guestId,
                input: normalized,
                pricing: quotePricing,
                expiresAt,
              },
              this.secret(),
            ),
          };
        },
      ),
    );
  }

  private checkSettlement(
    booking: ManagedBooking,
    total: number,
    policy: ManagementPolicy,
  ) {
    if (
      policy.modificationSettlement === 'SAME_TOTAL_ONLY' &&
      total !== booking.totalAmount
    )
      throw new ConflictException({
        error: 'PRICE_CHANGE_REQUIRES_STAFF',
        message:
          'This change alters the total price. Contact the hotel to arrange payment or refund.',
      });
  }

  async modify(
    guestId: string,
    id: string,
    token: string,
    key: string | undefined,
  ) {
    this.key(key);
    const preview = readQuote(token, this.secret(), guestId);
    if (!preview || preview.pricing.managementBookingId !== id)
      throw new BadRequestException('Invalid booking change quote.');
    const requestHash = hash({ kind: 'MODIFIED', token });
    const result = await this.run(() =>
      this.repository.locked(
        id,
        guestId,
        preview.input.roomTypeId,
        async (manager, booking, now) => {
          const previous = this.replay(booking, key!, requestHash);
          if (previous) return this.result(booking, previous, true);
          const policy = this.policy();
          this.eligible(booking, now, policy);
          if (
            preview.pricing.managementBinding !== binding(booking) ||
            preview.pricing.managementPolicy !== hash(policy)
          )
            throw new ConflictException({
              error: 'CHANGE_QUOTE_STALE',
              message:
                'The booking or policy changed. Request a fresh change quote.',
            });
          if (Date.parse(preview.expiresAt) <= now.getTime())
            throw new ConflictException('Change quote expired.');
          requireBeforeCutoff(preview.input.checkInDate, now, policy);
          const rate = await this.inventory.rate(
            manager,
            preview.input.roomTypeId,
          );
          if (!rate)
            throw new ConflictException('Room type is no longer available.');
          calculateRoomCharge(preview.input, rate.nightlyRate, rate.maxGuests);
          if ((await this.inventory.available(manager, preview.input, id)) < 1)
            throw new ConflictException({
              error: 'ROOM_UNAVAILABLE',
              message: 'The room is no longer available for these dates.',
            });
          const pricing = { ...preview.pricing };
          delete pricing.managementBinding;
          delete pricing.managementBookingId;
          delete pricing.managementPolicy;
          const total = Number(pricing.totalAmount);
          if (!Number.isSafeInteger(total) || total < 1)
            throw new BadRequestException('Invalid quote total.');
          this.checkSettlement(booking, total, policy);
          if (
            booking.roomTypeId !== preview.input.roomTypeId ||
            booking.checkInDate !== preview.input.checkInDate ||
            booking.checkOutDate !== preview.input.checkOutDate
          )
            booking.roomNumber = null;
          Object.assign(booking, preview.input, { totalAmount: total });
          booking.specialRequests =
            (preview.input as BookingChangeQuoteDto).specialRequests || null;
          booking.priceSnapshot = { ...booking.priceSnapshot, ...pricing };
          const event = await this.record(
            manager,
            booking,
            now,
            policy,
            key!,
            requestHash,
            'MODIFIED',
          );
          return this.result(booking, event, false);
        },
      ),
    );
    return this.afterEmail(id, result);
  }

  async cancel(
    guestId: string,
    id: string,
    expectedRevision: number,
    key: string | undefined,
  ) {
    this.key(key);
    const requestHash = hash({ kind: 'CANCELLED', revision: expectedRevision });
    const result = await this.run(() =>
      this.repository.locked(
        id,
        guestId,
        undefined,
        async (manager, booking, now) => {
          const previous = this.replay(booking, key!, requestHash);
          if (previous) return this.result(booking, previous, true);
          const policy = this.policy();
          this.eligible(booking, now, policy);
          if (revision(booking) !== expectedRevision)
            throw new ConflictException({
              error: 'BOOKING_CHANGED',
              message: 'The booking changed. Review it before cancelling.',
            });
          booking.status = 'CANCELLED';
          const event = await this.record(
            manager,
            booking,
            now,
            policy,
            key!,
            requestHash,
            'CANCELLED',
          );
          return this.result(booking, event, false);
        },
      ),
    );
    return this.afterEmail(id, result);
  }

  private key(value: string | undefined) {
    if (!value || !/^[A-Za-z0-9_-]{8,128}$/.test(value))
      throw new BadRequestException(
        'Provide an Idempotency-Key of 8–128 letters, digits, hyphens or underscores.',
      );
  }
  private replay(booking: ManagedBooking, key: string, requestHash: string) {
    const event = events(booking).find((entry) => entry.key === hash(key));
    if (event && event.hash !== requestHash)
      throw new ConflictException({
        error: 'IDEMPOTENCY_CONFLICT',
        message: 'This key was already used for a different request.',
      });
    return event;
  }
  private async record(
    manager: EntityManager,
    booking: ManagedBooking,
    now: Date,
    policy: ManagementPolicy,
    key: string,
    requestHash: string,
    kind: ManagementEvent['kind'],
  ) {
    const nextRevision = revision(booking) + 1;
    const event: ManagementEvent = {
      id: randomUUID(),
      key: hash(key),
      hash: requestHash,
      kind,
      at: now.toISOString(),
      policyVersion: policy.version,
      email: { state: 'PENDING' },
      receipt: {
        ...managementSummary(booking),
        currency: 'LKR',
        revision: nextRevision,
        roomType: await this.repository.roomName(manager, booking.roomTypeId),
      },
    };
    booking.priceSnapshot.management = {
      revision: nextRevision,
      events: [...events(booking), event],
    };
    await this.repository.save(manager, booking);
    return event;
  }
  private result(
    booking: ManagedBooking,
    event: ManagementEvent,
    replayed: boolean,
  ) {
    return {
      ...managementSummary(booking),
      operation: {
        id: event.id,
        kind: event.kind,
        at: event.at,
        policyVersion: event.policyVersion,
        emailStatus: event.email.state,
      },
      replayed,
    };
  }
  private async afterEmail(
    id: string,
    result: ReturnType<BookingManagementService['result']>,
  ) {
    // External email happens only after the booking transaction commits.
    const state = await this.email.send(id, result.operation.id);
    return {
      ...result,
      operation: {
        ...result.operation,
        emailStatus: state || result.operation.emailStatus,
      },
    };
  }
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'Booking management is unavailable. Keep your request key and retry.',
      );
    }
  }
}
