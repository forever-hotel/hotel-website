import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { ManagementEvent } from './booking-management.repository';
import type { EmailState } from '../payments/confirmation-email.repository';
import { deliverBookingEmail } from '../payments/booking-email-transport';

export function changeEmailText(event: ManagementEvent): string {
  const receipt = event.receipt;
  const money = (amount: number) =>
    `${receipt.currency} ${(amount / 100).toFixed(2)}`;
  return [
    event.kind === 'CANCELLED'
      ? 'Your reservation has been cancelled.'
      : 'Your reservation has been updated.',
    `Booking reference: ${receipt.bookingId}`,
    `Update reference: ${event.id}`,
    `Room: ${receipt.roomType}`,
    `Check-in: ${receipt.checkInDate}`,
    `Check-out: ${receipt.checkOutDate}`,
    `Status: ${receipt.status}`,
    `Total: ${money(receipt.totalAmount)}`,
    `Paid: ${money(receipt.paidAmount)}`,
    `Balance: ${money(receipt.balanceAmount)}`,
    ...(receipt.refundAmount > 0
      ? [
          `Refund awaiting hotel review: ${money(receipt.refundAmount)}. No refund has been issued by this request.`,
        ]
      : []),
    ...(receipt.balanceAmount > 0
      ? ['Contact the hotel to arrange the outstanding payment.']
      : []),
  ].join('\n');
}

@Injectable()
export class BookingChangeEmailService {
  private readonly logger = new Logger(BookingChangeEmailService.name);
  constructor(
    private readonly source: DataSource,
    private readonly config: ConfigService,
  ) {}

  async send(id: string, eventId: string): Promise<EmailState | null> {
    try {
      const claimed = await this.source.transaction(async (manager) => {
        const [row] = await manager.query<
          { email: string; events: ManagementEvent[] }[]
        >(
          `SELECT g.email,b.price_snapshot->'management'->'events' AS events FROM bookings b JOIN guests g ON g.guest_id=b.guest_id
            WHERE b.booking_id=$1 FOR UPDATE OF b`,
          [id],
        );
        if (!row || !Array.isArray(row.events)) return null;
        const index = row.events.findIndex((event) => event.id === eventId);
        if (index < 0) return null;
        const event = row.events[index];
        if (
          event.email.state !== 'PENDING' &&
          !(
            event.email.state === 'FAILED' &&
            event.email.attemptedAt &&
            Date.parse(event.email.attemptedAt) < Date.now() - 60000
          )
        )
          return null;
        await manager.query(
          'UPDATE bookings SET price_snapshot=jsonb_set(price_snapshot,$2::text[],$3::jsonb) WHERE booking_id=$1',
          [
            id,
            ['management', 'events', String(index), 'email'],
            JSON.stringify({
              state: 'SENDING',
              attemptedAt: new Date().toISOString(),
            }),
          ],
        );
        return { email: row.email, event, index };
      });
      if (!claimed) return null;
      const state = await deliverBookingEmail(
        this.config,
        claimed.email,
        `Booking ${claimed.event.kind === 'CANCELLED' ? 'cancellation' : 'update'} ${id}`,
        changeEmailText(claimed.event),
      );
      await this.source.query(
        `UPDATE bookings SET price_snapshot=jsonb_set(price_snapshot,$2::text[],to_jsonb($3::text))
        WHERE booking_id=$1 AND price_snapshot #>> $4::text[]=$5 AND price_snapshot #>> $2::text[]='SENDING'`,
        [
          id,
          ['management', 'events', String(claimed.index), 'email', 'state'],
          state,
          ['management', 'events', String(claimed.index), 'id'],
          eventId,
        ],
      );
      if (state === 'FAILED' || state === 'UNKNOWN')
        this.logger.warn({
          event: 'booking_change_email_review_required',
          bookingId: id,
          operationId: eventId,
          state,
        });
      return state;
    } catch {
      this.logger.warn({
        event: 'booking_change_email_review_required',
        bookingId: id,
        operationId: eventId,
      });
      return 'UNKNOWN';
    }
  }
}
