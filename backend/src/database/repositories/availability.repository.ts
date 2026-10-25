import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface InventoryRoom {
  roomNumber: string;
  status: string;
}
export interface InventoryBooking {
  roomNumber: string | null;
  checkInDate: string;
  checkOutDate: string;
}
export interface InventorySnapshot {
  maxGuests: number;
  rooms: InventoryRoom[];
  bookings: InventoryBooking[];
}

/** Read-only snapshot of the infra-owned schema; never reserves inventory. */
@Injectable()
export class AvailabilityRepository {
  constructor(private readonly dataSource: DataSource) {}

  async snapshot(
    roomTypeId: string,
    from: string,
    to: string,
  ): Promise<InventorySnapshot | null> {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const types = await manager.query<{ maxGuests: number }[]>(
        'SELECT max_guests AS "maxGuests" FROM room_types WHERE room_type_id = $1',
        [roomTypeId],
      );
      if (!types.length) return null;
      const rooms = await manager.query<InventoryRoom[]>(
        'SELECT room_number AS "roomNumber", status FROM rooms WHERE room_type_id = $1',
        [roomTypeId],
      );
      const bookings = await manager.query<InventoryBooking[]>(
        `SELECT room_number AS "roomNumber",
                check_in_date::text AS "checkInDate",
                check_out_date::text AS "checkOutDate"
         FROM bookings WHERE room_type_id = $1
           AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
           AND check_in_date < $3::date AND check_out_date > $2::date
           AND NOT (status='PENDING' AND source='WEBSITE'
             AND COALESCE(to_jsonb(bookings)->>'checkout_key','')<>''
             AND COALESCE((to_jsonb(bookings)->>'hold_expires_at')::timestamptz<=clock_timestamp(),false))`,
        [roomTypeId, from, to],
      );
      return { maxGuests: types[0].maxGuests, rooms, bookings };
    });
  }
}
