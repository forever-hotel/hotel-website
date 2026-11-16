import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type BookingCategory = 'upcoming' | 'past' | 'cancelled';
export interface GuestBooking {
  bookingId: string;
  roomType: string | null;
  roomImage: string | null;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: string;
  holdExpired: boolean;
  category: BookingCategory;
  totalAmount: number;
  currency: string | null;
  paidAmount: number;
  balanceAmount: number;
  refundAmount: number;
  refundStatus: string | null;
  managementRevision: number;
}
export const GUEST_BOOKINGS_PAGE_SIZE = 20;

// Scope every read before joining catalogue data. Never return checkout keys,
// provider references, guest IDs or payment payloads to the dashboard.
const OWNED = `WITH owned AS (
  SELECT b.booking_id AS "bookingId",t.type_name AS "roomType",
    (SELECT i.image_url FROM room_type_images i WHERE i.room_type_id=b.room_type_id
      ORDER BY i.created_at,i.image_url LIMIT 1) AS "roomImage",
    b.check_in_date::text AS "checkInDate",b.check_out_date::text AS "checkOutDate",
    b.num_guests AS "numberOfGuests",b.status,b.total_amount AS "totalAmount",b.currency,
    b.special_requests AS "specialRequests",
    COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_status='COMPLETED'),0)::int AS "paidAmount",
    COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_status='REFUNDED'),0)::int AS "refundedAmount",
    COALESCE((b.price_snapshot->'management'->>'revision')::int,0) AS "managementRevision",
    COALESCE(b.status='PENDING' AND b.source='WEBSITE' AND b.checkout_key IS NOT NULL
      AND b.hold_expires_at<=CURRENT_TIMESTAMP,false) AS "holdExpired"
  FROM bookings b LEFT JOIN room_types t ON t.room_type_id=b.room_type_id WHERE b.guest_id=$1
), categorized AS (
  SELECT *, CASE WHEN status='CANCELLED' THEN 'cancelled'
    WHEN status='CHECKED_OUT' OR "checkOutDate"<=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')::date::text
      OR "holdExpired" THEN 'past' ELSE 'upcoming' END AS category,
    CASE WHEN status='CANCELLED' OR "holdExpired" THEN 0 ELSE GREATEST(0,"totalAmount"-"paidAmount") END AS "balanceAmount",
    CASE WHEN "managementRevision">0 THEN GREATEST(0,"paidAmount"-CASE WHEN status='CANCELLED' THEN 0 ELSE "totalAmount" END) ELSE 0 END AS "refundAmount"
    FROM owned
)`;
const PUBLIC_COLUMNS = `"bookingId","roomType","roomImage","checkInDate","checkOutDate",
  "numberOfGuests",status,"totalAmount",currency,"holdExpired",category,"paidAmount","balanceAmount","refundAmount","managementRevision",
  CASE WHEN "refundAmount">0 THEN 'PENDING' WHEN "managementRevision">0 AND "refundedAmount">0 THEN 'REFUNDED' ELSE NULL END AS "refundStatus"`;

@Injectable()
export class GuestBookingsRepository {
  constructor(private readonly source: DataSource) {}

  list(guestId: string, category: BookingCategory, page: number) {
    return this.source.transaction('REPEATABLE READ', async (manager) => {
      const [counts] = await manager.query<
        { upcoming: number; past: number; cancelled: number; total: number }[]
      >(
        `${OWNED} SELECT count(*)::int AS total,
        count(*) FILTER (WHERE category='upcoming')::int AS upcoming,
        count(*) FILTER (WHERE category='past')::int AS past,
        count(*) FILTER (WHERE category='cancelled')::int AS cancelled FROM categorized`,
        [guestId],
      );
      const items = await manager.query<GuestBooking[]>(
        `${OWNED} SELECT ${PUBLIC_COLUMNS} FROM categorized WHERE category=$2
          ORDER BY CASE WHEN category='upcoming' THEN "checkInDate" END ASC,
            "checkInDate" DESC,"bookingId" LIMIT $3 OFFSET $4`,
        [
          guestId,
          category,
          GUEST_BOOKINGS_PAGE_SIZE,
          (page - 1) * GUEST_BOOKINGS_PAGE_SIZE,
        ],
      );
      return {
        items,
        counts,
        category,
        page,
        pageSize: GUEST_BOOKINGS_PAGE_SIZE,
      };
    });
  }

  async detail(guestId: string, bookingId: string) {
    const rows = await this.source.query<
      (GuestBooking & { specialRequests: string | null })[]
    >(
      `${OWNED} SELECT ${PUBLIC_COLUMNS},"specialRequests" FROM categorized WHERE "bookingId"=$2`,
      [guestId, bookingId],
    );
    return rows[0] || null;
  }
}
