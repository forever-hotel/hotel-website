import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PaymentRepository,
  CheckoutPayment,
} from '../database/repositories/payment.repository';
import type { BillingDto } from './payhere.dto';
import type { PayHereReceipt } from './payhere-provider';

export interface PayHerePayment extends CheckoutPayment {
  provider: 'PAYHERE';
  environment: string;
  billing: BillingDto;
  providerReference?: string;
  reviewRequired?: boolean;
  receipts: { reference: string; rowId: string; status: string }[];
}

@Injectable()
export class PayHereRepository extends PaymentRepository {
  async supported(): Promise<boolean> {
    const rows = await this.source.query<{ supported: boolean }[]>(
      "SELECT EXISTS(SELECT 1 FROM pg_enum WHERE enumtypid='payment_method'::regtype AND enumlabel='PAYHERE') AS supported",
    );
    return rows[0]?.supported === true;
  }

  prepareCheckout(
    id: string,
    guestId: string,
    environment: string,
    billing?: BillingDto,
  ) {
    return this.locked(id, guestId, async (manager, booking, now) => {
      const existing = booking.priceSnapshot.payment as
        PayHerePayment | undefined;
      if (
        booking.status !== 'PENDING' ||
        !booking.holdExpiresAt ||
        booking.holdExpiresAt <= now
      )
        throw new ConflictException(
          'This booking hold expired or changed. Refresh status.',
        );
      if (existing) {
        if (
          existing.provider !== 'PAYHERE' ||
          existing.environment !== environment
        )
          throw new ConflictException(
            'This booking uses a different payment provider or environment.',
          );
        return existing;
      }
      if (!billing)
        throw new ConflictException(
          'Start checkout with billing details first.',
        );
      const payment: PayHerePayment = {
        provider: 'PAYHERE',
        environment,
        billing,
        paymentId: randomUUID(),
        option: 'FULL',
        amount: booking.totalAmount,
        expiresAt: new Date(now.getTime() + 35 * 60000).toISOString(),
        receipts: [],
      };
      await manager.query(
        "INSERT INTO payments (payment_id,booking_id,payment_method,amount,payment_status) VALUES ($1,$2,'PAYHERE',$3,'PENDING')",
        [payment.paymentId, id, payment.amount],
      );
      await this.saveMeta(manager, id, payment);
      await manager.query(
        'UPDATE bookings SET hold_expires_at=$2 WHERE booking_id=$1',
        [id, payment.expiresAt],
      );
      return payment;
    });
  }

  async metadata(id: string, guestId: string) {
    const rows = await this.source.query<{ payment: PayHerePayment | null }[]>(
      `SELECT price_snapshot->'payment' AS payment FROM bookings WHERE booking_id=$1 AND guest_id=$2`,
      [id, guestId],
    );
    if (!rows[0]) throw new NotFoundException('Booking not found.');
    return rows[0].payment;
  }

  async locate(orderId: string) {
    const rows = await this.source.query<
      { bookingId: string; environment: string }[]
    >(
      `SELECT booking_id AS "bookingId",price_snapshot->'payment'->>'environment' AS environment FROM bookings
       WHERE price_snapshot->'payment'->>'provider'='PAYHERE' AND price_snapshot->'payment'->>'paymentId'=$1`,
      [orderId],
    );
    if (rows.length !== 1)
      throw new NotFoundException('Unknown PayHere order.');
    return rows[0];
  }

  settleReceipts(
    id: string,
    orderId: string,
    environment: string,
    receipts: PayHereReceipt[],
  ) {
    return this.locked(id, null, async (manager, booking, now) => {
      const payment = booking.priceSnapshot.payment as
        PayHerePayment | undefined;
      if (
        !payment ||
        payment.provider !== 'PAYHERE' ||
        payment.paymentId !== orderId ||
        payment.environment !== environment
      )
        throw new ConflictException('Payment identity changed.');
      for (const receipt of receipts) {
        if (receipt.orderId !== orderId || receipt.amount !== payment.amount)
          throw new ConflictException(
            'PayHere amount does not match the frozen booking.',
          );
        let recorded = payment.receipts.find(
          (r) => r.reference === receipt.paymentId,
        );
        if (!recorded) {
          const first = payment.receipts.length === 0;
          recorded = {
            reference: receipt.paymentId,
            rowId: first ? payment.paymentId : randomUUID(),
            status: receipt.status,
          };
          if (!first)
            await manager.query(
              "INSERT INTO payments (payment_id,booking_id,payment_method,amount,payment_status) VALUES ($1,$2,'PAYHERE',$3,'PENDING')",
              [recorded.rowId, id, payment.amount],
            );
          payment.receipts.push(recorded);
        }
        // Retrieval is authoritative; never let stale RECEIVED data reverse a refund/chargeback.
        if (
          ['REFUNDED', 'CHARGEBACKED'].includes(recorded.status) &&
          receipt.status === 'RECEIVED'
        )
          continue;
        recorded.status = receipt.status;
        const state =
          receipt.status === 'REFUNDED'
            ? 'REFUNDED'
            : receipt.status === 'CHARGEBACKED'
              ? 'FAILED'
              : 'COMPLETED';
        await manager.query(
          'UPDATE payments SET payment_status=$2,paid_at=COALESCE(paid_at,clock_timestamp()),updated_at=clock_timestamp() WHERE payment_id=$1',
          [recorded.rowId, state],
        );
        payment.providerReference ||= receipt.paymentId;
      }
      const received = payment.receipts.filter(
        (r) => r.status === 'RECEIVED',
      ).length;
      const refundInProgress = payment.receipts.some((r) =>
        ['REFUND REQUESTED', 'REFUND PROCESSING'].includes(r.status),
      );
      const disputed = payment.receipts.some(
        (r) => r.status === 'CHARGEBACKED',
      );
      const canConfirm =
        booking.status === 'PENDING' &&
        !!booking.holdExpiresAt &&
        booking.holdExpiresAt > now &&
        received === 1 &&
        payment.receipts.length === 1;
      if (canConfirm) {
        await manager.query(
          "UPDATE bookings SET status='CONFIRMED',updated_at=clock_timestamp() WHERE booking_id=$1",
          [id],
        );
        booking.status = 'CONFIRMED';
      }
      payment.refundRequired =
        received > 1 ||
        refundInProgress ||
        (received > 0 &&
          !['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status));
      payment.reviewRequired =
        disputed ||
        payment.refundRequired ||
        (payment.receipts.length > 0 && received === 0);
      payment.refundStatus = payment.refundRequired
        ? 'PENDING'
        : received === 0 &&
            payment.receipts.some((r) => r.status === 'REFUNDED')
          ? 'REFUNDED'
          : undefined;
      if (payment.refundRequired && booking.status === 'PENDING')
        await manager.query(
          "UPDATE bookings SET status='CANCELLED',updated_at=clock_timestamp() WHERE booking_id=$1",
          [id],
        );
      await this.saveMeta(manager, id, payment);
      return { reviewRequired: payment.reviewRequired, paid: received > 0 };
    });
  }

  cancelCheckout(id: string, guestId: string) {
    return this.locked(id, guestId, async (manager, booking) => {
      if (booking.status !== 'PENDING')
        throw new ConflictException(
          'Only an unpaid pending booking can be cancelled.',
        );
      await manager.query(
        "UPDATE bookings SET status='CANCELLED',updated_at=clock_timestamp() WHERE booking_id=$1",
        [id],
      );
    });
  }
}
