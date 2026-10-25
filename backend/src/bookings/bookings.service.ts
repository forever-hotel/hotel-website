import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import {
  BookingRepository,
  CheckoutRecord,
} from '../database/repositories/booking.repository';
import { CreateBookingQuoteDto } from './dto/create-booking-quote.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { BOOKING_POLICY, expiresAt, hotelDate } from './booking-policy';
import { calculateRoomCharge } from './room-charge';
import { calculateQuotePricing, QuotePricingPolicy } from './quote-pricing';
import { readQuote, signQuote } from './quote-token';

@Injectable()
export class BookingsService {
  constructor(
    private readonly repository: BookingRepository,
    private readonly config: ConfigService,
  ) {}
  private secret(): string {
    return this.config.get<string>('jwt.secret') || '';
  }
  private pricing(
    input: CreateBookingQuoteDto,
    rate: number,
    capacity: number,
    now: Date,
  ) {
    this.validateStay(input, now);
    const charge = calculateRoomCharge(input, rate, capacity);
    try {
      const policy = JSON.parse(
        this.config.get<string>('BOOKING_PRICING_POLICY') || '',
      ) as QuotePricingPolicy;
      return {
        ...calculateQuotePricing(charge.subtotal, policy),
        nights: charge.nights,
        nightlyRate: rate,
        roomLineItems: charge.lineItems,
      };
    } catch {
      throw new ServiceUnavailableException({
        error: 'PRICING_POLICY_UNAVAILABLE',
        message:
          'The hotel pricing policy is not configured. Please contact the hotel.',
      });
    }
  }
  private validateStay(input: CreateBookingQuoteDto, now: Date) {
    if (input.checkInDate < hotelDate(now))
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Check-in cannot be in the past.',
      });
  }
  async createQuote(guestId: string, input: CreateBookingQuoteDto) {
    return this.run(() =>
      this.repository.transaction(async (manager) => {
        const rate = await this.repository.rate(manager, input.roomTypeId);
        if (!rate)
          throw new NotFoundException({
            error: 'ROOM_TYPE_NOT_FOUND',
            message: 'Room type not found.',
          });
        const now = await this.repository.now(manager);
        const pricing = this.pricing(
          input,
          rate.nightlyRate,
          rate.maxGuests,
          now,
        );
        if ((await this.repository.available(manager, input)) < 1)
          throw this.conflict(
            'ROOM_UNAVAILABLE',
            'No room is available for these dates.',
          );
        const preview = {
          quoteId: randomUUID(),
          guestId,
          input,
          pricing,
          expiresAt: expiresAt(
            now,
            BOOKING_POLICY.quoteLifetimeSeconds,
          ).toISOString(),
        };
        return {
          quoteId: preview.quoteId,
          quoteToken: signQuote(preview, this.secret()),
          ...input,
          ...pricing,
          expiresAt: preview.expiresAt,
        };
      }),
    );
  }
  async createReservation(
    guestId: string,
    input: CreateReservationDto,
    key: string | undefined,
  ) {
    if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message:
          'Provide an Idempotency-Key of 8–128 letters, digits, hyphens or underscores.',
      });
    const preview = readQuote(input.quoteToken, this.secret(), guestId);
    if (!preview)
      throw new NotFoundException({
        error: 'QUOTE_NOT_FOUND',
        message: 'Invalid quote or quote belongs to another guest.',
      });
    const requests = input.specialRequests?.trim() || '';
    const hash = createHash('sha256')
      .update(
        JSON.stringify({ quoteId: preview.quoteId, specialRequests: requests }),
      )
      .digest('hex');
    return this.run(() =>
      this.repository.transaction(async (manager) => {
        const existing = await this.repository.lockAttempt(
          manager,
          guestId,
          key,
        );
        if (existing) {
          if (existing.checkoutRequestHash !== hash)
            throw this.conflict(
              'IDEMPOTENCY_CONFLICT',
              'This key was used with different checkout details.',
            );
          if (
            existing.status === 'CANCELLED' ||
            (existing.status === 'PENDING' &&
              (!existing.holdExpiresAt ||
                existing.holdExpiresAt.getTime() <=
                  (await this.repository.now(manager)).getTime()))
          )
            throw this.conflict(
              'HOLD_EXPIRED',
              'This checkout expired or was cancelled. Start checkout again.',
            );
          return this.response(existing);
        }
        if (
          await this.repository.lockPreview(manager, guestId, preview.quoteId)
        )
          throw this.conflict(
            'QUOTE_ALREADY_USED',
            'This price preview already has a checkout.',
          );
        const rate = await this.repository.rate(
          manager,
          preview.input.roomTypeId,
        );
        if (!rate)
          throw new NotFoundException({
            error: 'ROOM_TYPE_NOT_FOUND',
            message: 'Room type not found.',
          });
        this.validateStay(preview.input, await this.repository.now(manager));
        if (preview.input.numberOfGuests > rate.maxGuests)
          throw new BadRequestException({
            error: 'CAPACITY_EXCEEDED',
            message: 'Room capacity changed. Choose another room.',
          });
        if ((await this.repository.available(manager, preview.input)) < 1)
          throw this.conflict(
            'ROOM_UNAVAILABLE',
            'The room is no longer available.',
          );
        const now = await this.repository.now(manager);
        if (Date.parse(preview.expiresAt) <= now.getTime())
          throw this.conflict(
            'QUOTE_EXPIRED',
            'Request a fresh price preview.',
          );
        // Honour the signed price, not today's catalogue rate or tax configuration.
        const booking: CheckoutRecord = {
          bookingId: randomUUID(),
          guestId,
          roomTypeId: preview.input.roomTypeId,
          checkInDate: preview.input.checkInDate,
          checkOutDate: preview.input.checkOutDate,
          numberOfGuests: preview.input.numberOfGuests,
          specialRequests: requests || null,
          status: 'PENDING',
          totalAmount: Number(preview.pricing.totalAmount),
          holdExpiresAt: expiresAt(now, BOOKING_POLICY.reservationHoldSeconds),
          checkoutRequestHash: hash,
          priceSnapshot: { quoteId: preview.quoteId, ...preview.pricing },
          currency: 'LKR',
        };
        await this.repository.reserve(manager, booking, key);
        return this.response(booking);
      }),
    );
  }
  private response(booking: CheckoutRecord) {
    return {
      ...booking.priceSnapshot,
      bookingId: booking.bookingId,
      roomTypeId: booking.roomTypeId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfGuests: booking.numberOfGuests,
      specialRequests: booking.specialRequests || '',
      status: booking.status,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      ...(booking.status === 'PENDING'
        ? { paidAmount: 0, balanceAmount: booking.totalAmount }
        : {}),
      holdExpiresAt: booking.holdExpiresAt?.toISOString() || null,
    };
  }
  private conflict(error: string, message: string) {
    return new ConflictException({ error, message });
  }
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException({
        error: 'BOOKING_UNAVAILABLE',
        message: 'Booking storage is unavailable. Please try again later.',
      });
    }
  }
}
