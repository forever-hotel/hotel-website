import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import type Stripe from 'stripe';
import { amountDue, PaymentOption } from '../../payments/payment-policy';

export interface CheckoutPayment {
  paymentId: string;
  option: PaymentOption;
  amount: number;
  expiresAt: string;
  sessionId?: string;
  checkoutUrl?: string | null;
  refundRequired?: boolean;
  refundStatus?: 'PENDING' | 'REFUNDED';
}
export interface PaymentBooking {
  bookingId: string;
  guestId: string;
  roomTypeId: string;
  status: string;
  totalAmount: number;
  currency: string;
  holdExpiresAt: Date | null;
  priceSnapshot: Record<string, unknown> & { payment?: CheckoutPayment };
}

const bookingColumns = `booking_id AS "bookingId",guest_id AS "guestId",room_type_id AS "roomTypeId",status,
  total_amount AS "totalAmount",currency,hold_expires_at AS "holdExpiresAt",price_snapshot AS "priceSnapshot"`;

@Injectable()
export class PaymentRepository {
  constructor(protected readonly source: DataSource) {}

  async recover(guestId: string, quoteId: string) {
    const rows = await this.source.query<{ bookingId: string }[]>(
      "SELECT booking_id AS \"bookingId\" FROM bookings WHERE guest_id=$1 AND price_snapshot->>'quoteId'=$2 AND status='PENDING' AND hold_expires_at>clock_timestamp() AND checkout_key IS NOT NULL LIMIT 1",
      [guestId, quoteId],
    );
    return { bookingId: rows[0]?.bookingId || null };
  }

  protected async locked<T>(
    id: string,
    guestId: string | null,
    work: (
      manager: EntityManager,
      booking: PaymentBooking,
      now: Date,
    ) => Promise<T>,
  ): Promise<T> {
    return this.source.transaction('READ COMMITTED', async (manager) => {
      const refs = await manager.query<{ roomTypeId: string }[]>(
        'SELECT room_type_id AS "roomTypeId" FROM bookings WHERE booking_id=$1 AND ($2::uuid IS NULL OR guest_id=$2)',
        [id, guestId],
      );
      if (!refs[0]) throw new NotFoundException('Booking not found.');
      // Shared inventory lock first, then booking/payment; never hold it over Stripe IO.
      await manager.query(
        'SELECT room_type_id FROM room_types WHERE room_type_id=$1 FOR UPDATE',
        [refs[0].roomTypeId],
      );
      const rows = await manager.query<PaymentBooking[]>(
        `SELECT ${bookingColumns} FROM bookings WHERE booking_id=$1 FOR UPDATE`,
        [id],
      );
      if (!rows[0] || (guestId !== null && rows[0].guestId !== guestId))
        throw new NotFoundException('Booking not found.');
      const times = await manager.query<{ now: Date }[]>(
        'SELECT clock_timestamp() AS now',
      );
      return work(manager, rows[0], times[0].now);
    });
  }

  prepare(
    id: string,
    guestId: string,
    option: PaymentOption,
    percent: number | null,
    minutes: number,
  ) {
    return this.locked(id, guestId, async (manager, booking, now) => {
      const existing = booking.priceSnapshot?.payment;
      if (existing && existing.option !== option)
        throw new ConflictException(
          'This checkout already uses another payment option.',
        );
      if (
        booking.status !== 'PENDING' ||
        !booking.holdExpiresAt ||
        booking.holdExpiresAt <= now
      )
        throw new ConflictException(
          'This hold is no longer payable. Check booking status or start a fresh stay.',
        );
      if (existing) return existing;
      const payment: CheckoutPayment = {
        paymentId: randomUUID(),
        option,
        amount: amountDue(booking.totalAmount, option, percent),
        expiresAt: new Date(now.getTime() + minutes * 60000).toISOString(),
      };
      await manager.query(
        "INSERT INTO payments (payment_id,booking_id,payment_method,amount,payment_status) VALUES ($1,$2,'STRIPE',$3,'PENDING')",
        [payment.paymentId, id, payment.amount],
      );
      await manager.query(
        "UPDATE bookings SET hold_expires_at=$2,price_snapshot=jsonb_set(price_snapshot,'{payment}',$3::jsonb),updated_at=clock_timestamp() WHERE booking_id=$1",
        [id, payment.expiresAt, JSON.stringify(payment)],
      );
      return payment;
    });
  }

  attach(id: string, guestId: string, session: Stripe.Checkout.Session) {
    return this.locked(id, guestId, async (manager, booking) => {
      const payment = booking.priceSnapshot.payment;
      if (!payment || (payment.sessionId && payment.sessionId !== session.id))
        throw new ConflictException('Payment session changed.');
      await manager.query(
        'UPDATE payments SET stripe_ref=$2,updated_at=clock_timestamp() WHERE payment_id=$1 AND (stripe_ref IS NULL OR stripe_ref=$2)',
        [payment.paymentId, session.id],
      );
      await this.saveMeta(manager, id, {
        ...payment,
        sessionId: session.id,
        checkoutUrl: session.url,
      });
    });
  }

  async sessionFor(id: string, guestId: string): Promise<string | null> {
    const rows = await this.source.query<{ sessionId: string | null }[]>(
      "SELECT price_snapshot->'payment'->>'sessionId' AS \"sessionId\" FROM bookings WHERE booking_id=$1 AND guest_id=$2",
      [id, guestId],
    );
    if (!rows[0]) throw new NotFoundException('Booking not found.');
    return rows[0].sessionId;
  }

  async settle(session: Stripe.Checkout.Session, failed = false) {
    const id = session.metadata?.bookingId;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id))
      throw new NotFoundException('Unknown payment booking.');
    return this.locked(id, null, async (manager, booking, now) => {
      const payment = booking.priceSnapshot.payment;
      if (
        !payment ||
        session.livemode ||
        session.mode !== 'payment' ||
        session.client_reference_id !== id ||
        session.metadata?.paymentId !== payment.paymentId ||
        session.currency !== 'lkr' ||
        session.amount_total !== payment.amount ||
        (payment.sessionId && payment.sessionId !== session.id)
      )
        throw new ConflictException(
          'Stripe payment does not match this booking.',
        );
      const rows = await manager.query<{ status: string }[]>(
        'SELECT payment_status AS status FROM payments WHERE payment_id=$1 FOR UPDATE',
        [payment.paymentId],
      );
      const status = rows[0]?.status;
      if (!status) throw new NotFoundException('Payment not found.');
      if (status === 'REFUNDED') return null;
      const meta = {
        ...payment,
        sessionId: session.id,
        checkoutUrl: session.url,
      };
      if (session.payment_status === 'paid' && session.status === 'complete') {
        if (status !== 'COMPLETED') {
          await manager.query(
            "UPDATE payments SET payment_status='COMPLETED',stripe_ref=$2,paid_at=clock_timestamp(),updated_at=clock_timestamp() WHERE payment_id=$1",
            [payment.paymentId, session.id],
          );
          if (
            booking.status === 'PENDING' &&
            booking.holdExpiresAt &&
            booking.holdExpiresAt > now
          ) {
            await manager.query(
              "UPDATE bookings SET status='CONFIRMED',updated_at=clock_timestamp() WHERE booking_id=$1",
              [id],
            );
          } else {
            meta.refundRequired = true;
            meta.refundStatus = 'PENDING';
            if (booking.status === 'PENDING')
              await manager.query(
                "UPDATE bookings SET status='CANCELLED',updated_at=clock_timestamp() WHERE booking_id=$1",
                [id],
              );
          }
        }
        await this.saveMeta(manager, id, meta);
        if (meta.refundRequired && typeof session.payment_intent !== 'string')
          throw new ConflictException(
            'Paid checkout is missing its payment intent.',
          );
        if (meta.refundRequired && typeof session.payment_intent === 'string')
          return {
            bookingId: id,
            paymentId: payment.paymentId,
            intent: session.payment_intent,
          };
      } else if (
        (session.status === 'expired' || failed) &&
        status !== 'COMPLETED'
      ) {
        await manager.query(
          "UPDATE payments SET payment_status='FAILED',stripe_ref=$2,updated_at=clock_timestamp() WHERE payment_id=$1",
          [payment.paymentId, session.id],
        );
        await manager.query(
          "UPDATE bookings SET status='CANCELLED',updated_at=clock_timestamp() WHERE booking_id=$1 AND status='PENDING'",
          [id],
        );
        await this.saveMeta(manager, id, meta);
      }
      return null;
    });
  }

  refunded(id: string, paymentId: string, succeeded: boolean) {
    return this.locked(id, null, async (manager, booking) => {
      const payment = booking.priceSnapshot.payment;
      if (
        payment?.paymentId === paymentId &&
        payment.refundStatus === 'REFUNDED'
      )
        return;
      if (
        !payment ||
        payment.paymentId !== paymentId ||
        !payment.refundRequired
      )
        throw new ConflictException('Unknown refund.');
      if (succeeded)
        await manager.query(
          "UPDATE payments SET payment_status='REFUNDED',updated_at=clock_timestamp() WHERE payment_id=$1",
          [paymentId],
        );
      await this.saveMeta(manager, id, {
        ...payment,
        refundStatus: succeeded ? 'REFUNDED' : 'PENDING',
        refundRequired: !succeeded,
      });
    });
  }

  protected saveMeta(
    manager: EntityManager,
    id: string,
    payment: CheckoutPayment,
  ) {
    return manager.query(
      "UPDATE bookings SET price_snapshot=jsonb_set(price_snapshot,'{payment}',$2::jsonb),updated_at=clock_timestamp() WHERE booking_id=$1",
      [id, JSON.stringify(payment)],
    );
  }

  async status(id: string, guestId: string) {
    const rows = await this.source.query<
      {
        bookingId: string;
        status: string;
        roomType: string;
        guestName: string;
        guestEmail: string;
        roomImage: string | null;
        specialRequests: string | null;
        checkInDate: string;
        checkOutDate: string;
        numberOfGuests: number;
        totalAmount: number;
        currency: string;
        holdExpiresAt: Date | null;
        priceSnapshot: Record<string, unknown> & { payment?: CheckoutPayment };
        paidAmount: number;
        refundedAmount: number;
        expired: boolean;
      }[]
    >(
      `SELECT b.booking_id AS "bookingId",b.status,t.type_name AS "roomType",
      g.full_name AS "guestName",g.email AS "guestEmail",b.special_requests AS "specialRequests",
      (SELECT i.image_url FROM room_type_images i WHERE i.room_type_id=b.room_type_id ORDER BY i.image_url LIMIT 1) AS "roomImage",
      b.check_in_date::text AS "checkInDate",b.check_out_date::text AS "checkOutDate",b.num_guests AS "numberOfGuests",
      b.total_amount AS "totalAmount",b.currency,b.hold_expires_at AS "holdExpiresAt",b.price_snapshot AS "priceSnapshot",
      COALESCE(b.hold_expires_at<=clock_timestamp(),true) AS expired,
      COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_status='COMPLETED'),0)::int AS "paidAmount",
      COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_status='REFUNDED'),0)::int AS "refundedAmount"
      FROM bookings b JOIN room_types t ON t.room_type_id=b.room_type_id JOIN guests g ON g.guest_id=b.guest_id WHERE b.booking_id=$1 AND b.guest_id=$2`,
      [id, guestId],
    );
    if (!rows[0]) throw new NotFoundException('Booking not found.');
    const row = rows[0];
    const { payment, confirmationEmail, management, ...pricing } =
      row.priceSnapshot || {};
    const managementState = management as
      | { revision?: number; events?: { email?: { state?: string } }[] }
      | undefined;
    const managed = !!managementState?.revision;
    const refundAmount = managed
      ? Math.max(
          0,
          row.paidAmount - (row.status === 'CANCELLED' ? 0 : row.totalAmount),
        )
      : 0;
    const managementReview =
      managed &&
      (refundAmount > 0 ||
        (row.status !== 'CANCELLED' && row.paidAmount < row.totalAmount));
    return {
      ...row,
      priceSnapshot: pricing,
      balanceAmount:
        row.status === 'CANCELLED' || (row.status === 'PENDING' && row.expired)
          ? 0
          : Math.max(0, row.totalAmount - row.paidAmount),
      paymentOption: payment?.option || null,
      amountDue: payment?.amount || null,
      paymentReference:
        (payment as CheckoutPayment & { providerReference?: string })
          ?.providerReference ||
        payment?.sessionId ||
        null,
      refundStatus:
        refundAmount > 0
          ? 'PENDING'
          : managed && row.refundedAmount > 0
            ? 'REFUNDED'
            : payment?.refundStatus || null,
      refundAmount,
      managementRevision: managementState?.revision || 0,
      changeEmailStatus: managementState?.events?.at(-1)?.email?.state || null,
      settlementReviewRequired: managementReview,
      paymentState:
        (managementReview ? 'REVIEW_REQUIRED' : null) ||
        payment?.refundStatus ||
        (['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(row.status)
          ? 'PAID'
          : row.status === 'CANCELLED'
            ? 'CANCELLED'
            : row.expired
              ? 'EXPIRED'
              : 'PENDING'),
      emailStatus:
        (confirmationEmail as { state?: string } | undefined)?.state ||
        'NOT_REQUESTED',
    };
  }
}
