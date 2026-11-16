import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type EmailState =
  'SENDING' | 'ACCEPTED' | 'SANDBOX' | 'FAILED' | 'UNKNOWN';
export interface Receipt {
  bookingId: string;
  email: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  currency: string;
  paidAmount: number;
  totalAmount: number;
}

@Injectable()
export class ConfirmationEmailRepository {
  constructor(private readonly source: DataSource) {}

  async claim(id: string): Promise<Receipt | null> {
    // One durable claim across processes. Never reclaim an ambiguous in-flight send.
    const rows = await this.source.query<Receipt[]>(
      `WITH claimed AS (UPDATE bookings b SET price_snapshot=jsonb_set(b.price_snapshot,'{confirmationEmail}',
        jsonb_build_object('state','SENDING','attemptedAt',clock_timestamp())),updated_at=clock_timestamp()
       FROM guests g,room_types t
       WHERE b.booking_id=$1 AND b.guest_id=g.guest_id AND b.room_type_id=t.room_type_id
         AND b.status='CONFIRMED' AND b.price_snapshot->'payment'->>'refundRequired' IS DISTINCT FROM 'true'
         AND b.price_snapshot->'payment'->>'reviewRequired' IS DISTINCT FROM 'true'
         AND EXISTS (SELECT 1 FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_status='COMPLETED')
         AND (b.price_snapshot->'confirmationEmail' IS NULL OR
           (b.price_snapshot->'confirmationEmail'->>'state'='FAILED' AND
            (b.price_snapshot->'confirmationEmail'->>'attemptedAt')::timestamptz < clock_timestamp()-interval '1 minute'))
       RETURNING b.booking_id AS "bookingId",g.email,t.type_name AS "roomType",
         b.check_in_date::text AS "checkInDate",b.check_out_date::text AS "checkOutDate",b.currency,
         b.total_amount AS "totalAmount",
         (SELECT sum(p.amount)::int FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_status='COMPLETED') AS "paidAmount")
       SELECT * FROM claimed`,
      [id],
    );
    return rows[0] || null;
  }

  async finish(id: string, state: EmailState) {
    await this.source.query(
      `UPDATE bookings SET price_snapshot=jsonb_set(price_snapshot,'{confirmationEmail,state}',to_jsonb($2::text)),updated_at=clock_timestamp()
       WHERE booking_id=$1 AND price_snapshot->'confirmationEmail'->>'state'='SENDING'`,
      [id, state],
    );
  }
}
