import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { CreateBookingQuoteDto } from '../../bookings/dto/create-booking-quote.dto';

export interface RoomRate {
  nightlyRate: number;
  maxGuests: number;
}
export interface CheckoutRecord {
  bookingId: string;
  guestId: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  specialRequests: string | null;
  status: string;
  totalAmount: number;
  holdExpiresAt: Date | null;
  checkoutRequestHash: string;
  priceSnapshot: Record<string, unknown>;
  currency: string;
}

const CHECKOUT_COLUMNS = `booking_id AS "bookingId",guest_id AS "guestId",room_type_id AS "roomTypeId",
  check_in_date::text AS "checkInDate",check_out_date::text AS "checkOutDate",num_guests AS "numberOfGuests",
  special_requests AS "specialRequests",status,total_amount AS "totalAmount",hold_expires_at AS "holdExpiresAt",
  checkout_request_hash AS "checkoutRequestHash",price_snapshot AS "priceSnapshot",currency`;

@Injectable()
export class BookingRepository {
  constructor(private readonly source: DataSource) {}
  transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.source.transaction('READ COMMITTED', work);
  }
  async now(manager: EntityManager): Promise<Date> {
    const rows = await manager.query<{ now: Date }[]>(
      'SELECT clock_timestamp() AS now',
    );
    return rows[0].now;
  }
  async rate(manager: EntityManager, id: string): Promise<RoomRate | null> {
    const rows = await manager.query<RoomRate[]>(
      'SELECT price_per_night AS "nightlyRate",max_guests AS "maxGuests" FROM room_types WHERE room_type_id=$1 FOR UPDATE',
      [id],
    );
    return rows[0] || null;
  }
  async lockAttempt(
    manager: EntityManager,
    guestId: string,
    key: string,
  ): Promise<CheckoutRecord | null> {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
      [`hw-checkout:${guestId}:${key}`],
    );
    const rows = await manager.query<CheckoutRecord[]>(
      `SELECT ${CHECKOUT_COLUMNS} FROM bookings WHERE guest_id=$1 AND checkout_key=$2 FOR UPDATE`,
      [guestId, key],
    );
    return rows[0] || null;
  }
  async lockPreview(
    manager: EntityManager,
    guestId: string,
    quoteId: string,
  ): Promise<boolean> {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
      [`hw-preview:${guestId}:${quoteId}`],
    );
    const rows = await manager.query<{ bookingId: string }[]>(
      `SELECT booking_id AS "bookingId" FROM bookings WHERE guest_id=$1 AND price_snapshot->>'quoteId'=$2 AND checkout_key IS NOT NULL`,
      [guestId, quoteId],
    );
    return rows.length > 0;
  }
  async available(
    manager: EntityManager,
    input: CreateBookingQuoteDto,
  ): Promise<number> {
    const rows = await manager.query<{ count: number }[]>(
      `
      SELECT GREATEST(0,
        (SELECT count(*) FROM rooms r WHERE r.room_type_id=$1
         AND r.status IN ('VACANT','OCCUPIED','REQUIRES_CLEANING')
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.room_number=r.room_number
           AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN')
           AND b.check_in_date<$3::date AND b.check_out_date>$2::date
           AND NOT (b.status='PENDING' AND b.source='WEBSITE'
             AND COALESCE(to_jsonb(b)->>'checkout_key','')<>''
             AND COALESCE((to_jsonb(b)->>'hold_expires_at')::timestamptz<=clock_timestamp(),false))))
        - (SELECT count(*) FROM bookings b WHERE b.room_type_id=$1 AND b.room_number IS NULL
          AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN')
          AND b.check_in_date<$3::date AND b.check_out_date>$2::date
          AND NOT (b.status='PENDING' AND b.source='WEBSITE'
            AND COALESCE(to_jsonb(b)->>'checkout_key','')<>''
            AND COALESCE((to_jsonb(b)->>'hold_expires_at')::timestamptz<=clock_timestamp(),false)))
      )::int AS count`,
      [input.roomTypeId, input.checkInDate, input.checkOutDate],
    );
    return rows[0].count;
  }
  async reserve(
    manager: EntityManager,
    booking: CheckoutRecord,
    key: string,
  ): Promise<void> {
    await manager.query(
      `UPDATE bookings SET status='CANCELLED',updated_at=clock_timestamp()
      WHERE room_type_id=$1 AND status='PENDING' AND source='WEBSITE'
      AND checkout_key IS NOT NULL AND hold_expires_at<=clock_timestamp()`,
      [booking.roomTypeId],
    );
    await manager.query(
      `INSERT INTO bookings (booking_id,guest_id,room_type_id,check_in_date,check_out_date,
      num_guests,total_amount,status,source,special_requests,hold_expires_at,checkout_key,checkout_request_hash,price_snapshot,currency)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING','WEBSITE',$8,$9,$10,$11,$12::jsonb,$13)`,
      [
        booking.bookingId,
        booking.guestId,
        booking.roomTypeId,
        booking.checkInDate,
        booking.checkOutDate,
        booking.numberOfGuests,
        booking.totalAmount,
        booking.specialRequests,
        booking.holdExpiresAt,
        key,
        booking.checkoutRequestHash,
        JSON.stringify(booking.priceSnapshot),
        booking.currency,
      ],
    );
  }
}
