import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { EmailState } from '../payments/confirmation-email.repository';

export interface ManagementEvent {
  id: string;
  key: string;
  hash: string;
  kind: 'MODIFIED' | 'CANCELLED';
  at: string;
  policyVersion: string;
  email: { state: 'PENDING' | EmailState; attemptedAt?: string };
  receipt: {
    bookingId: string;
    roomType: string;
    status: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
    totalAmount: number;
    currency: string;
    paidAmount: number;
    balanceAmount: number;
    refundAmount: number;
    refundStatus: 'PENDING' | 'REFUNDED' | null;
    revision: number;
  };
}
export interface ManagedBooking {
  bookingId: string;
  guestId: string;
  roomTypeId: string;
  roomNumber: string | null;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: string;
  source: string;
  currency: string | null;
  totalAmount: number;
  specialRequests: string | null;
  holdExpiresAt: Date | null;
  priceSnapshot: Record<string, unknown> & {
    management?: { revision: number; events: ManagementEvent[] };
  };
  paidAmount: number;
  refundedAmount?: number;
}

@Injectable()
export class BookingManagementRepository {
  constructor(private readonly source: DataSource) {}

  locked<T>(
    id: string,
    guestId: string,
    targetRoom: string | undefined,
    work: (
      manager: EntityManager,
      booking: ManagedBooking,
      now: Date,
    ) => Promise<T> | T,
  ): Promise<T> {
    return this.source.transaction('READ COMMITTED', async (manager) => {
      const [ref] = await manager.query<{ roomTypeId: string }[]>(
        'SELECT room_type_id AS "roomTypeId" FROM bookings WHERE booking_id=$1 AND guest_id=$2',
        [id, guestId],
      );
      if (!ref) throw new NotFoundException('Booking not found.');
      // All website inventory writers lock room types before booking rows.
      // Consistent ordering avoids deadlocks when two guests swap room types.
      for (const roomId of [
        ...new Set(
          [ref.roomTypeId, targetRoom || ref.roomTypeId].map((value) =>
            value.toLowerCase(),
          ),
        ),
      ].sort())
        await manager.query(
          'SELECT room_type_id FROM room_types WHERE room_type_id=$1 FOR UPDATE',
          [roomId],
        );
      const [booking] = await manager.query<ManagedBooking[]>(
        `SELECT booking_id AS "bookingId",guest_id AS "guestId",room_type_id AS "roomTypeId",
          room_number AS "roomNumber",check_in_date::text AS "checkInDate",check_out_date::text AS "checkOutDate",
          num_guests AS "numberOfGuests",status,source,currency,total_amount AS "totalAmount",
          special_requests AS "specialRequests",hold_expires_at AS "holdExpiresAt",COALESCE(price_snapshot,'{}'::jsonb) AS "priceSnapshot"
         FROM bookings WHERE booking_id=$1 AND guest_id=$2 FOR UPDATE`,
        [id, guestId],
      );
      if (!booking) throw new NotFoundException('Booking not found.');
      if (booking.roomTypeId !== ref.roomTypeId)
        throw new ConflictException(
          'Booking changed concurrently. Refresh and retry.',
        );
      // Lock provider rows after inventory/booking, matching settlement lock order.
      await manager.query(
        'SELECT payment_id FROM payments WHERE booking_id=$1 FOR UPDATE',
        [id],
      );
      const [paid] = await manager.query<
        { amount: number; refunded: number }[]
      >(
        "SELECT COALESCE(sum(amount) FILTER (WHERE payment_status='COMPLETED'),0)::int AS amount, COALESCE(sum(amount) FILTER (WHERE payment_status='REFUNDED'),0)::int AS refunded FROM payments WHERE booking_id=$1",
        [id],
      );
      booking.paidAmount = paid.amount;
      booking.refundedAmount = paid.refunded;
      const [time] = await manager.query<{ now: Date }[]>(
        'SELECT clock_timestamp() AS now',
      );
      return work(manager, booking, time.now);
    });
  }

  async roomName(manager: EntityManager, roomTypeId: string): Promise<string> {
    const [room] = await manager.query<{ name: string }[]>(
      'SELECT type_name AS name FROM room_types WHERE room_type_id=$1',
      [roomTypeId],
    );
    if (!room) throw new NotFoundException('Room type not found.');
    return room.name;
  }

  save(manager: EntityManager, booking: ManagedBooking) {
    return manager.query(
      `UPDATE bookings SET room_type_id=$2,room_number=$3,check_in_date=$4,check_out_date=$5,
      num_guests=$6,total_amount=$7,status=$8,special_requests=$9,price_snapshot=$10::jsonb,updated_at=clock_timestamp()
      WHERE booking_id=$1`,
      [
        booking.bookingId,
        booking.roomTypeId,
        booking.roomNumber,
        booking.checkInDate,
        booking.checkOutDate,
        booking.numberOfGuests,
        booking.totalAmount,
        booking.status,
        booking.specialRequests,
        JSON.stringify(booking.priceSnapshot),
      ],
    );
  }
}
