import Link from 'next/link';
import { RoomImage } from '@/features/rooms/components/room-image';
import { safeRoomImage } from '@/config/room-images';
import {
  bookingNights,
  bookingPrice,
  bookingStatus,
  stayDate,
} from './dashboard';
import type { GuestBooking } from './dashboard';
import styles from './dashboard.module.css';

export function BookingCard({
  booking,
  detail = false,
}: {
  booking: GuestBooking;
  detail?: boolean;
}) {
  return (
    <article
      className={styles.card}
      aria-label={`${booking.roomType}, ${bookingStatus(booking)}`}
    >
      <div className={styles.thumbnail}>
        <RoomImage
          key={booking.roomImage}
          source={
            booking.roomImage ? safeRoomImage(booking.roomImage) : undefined
          }
          name={booking.roomType}
        />
      </div>
      <div className={styles.description}>
        <p className={styles.reference}>Reference: {booking.bookingId}</p>
        <h2>{booking.roomType}</h2>
        <p>
          <time dateTime={booking.checkInDate}>
            {stayDate(booking.checkInDate)}
          </time>{' '}
          –{' '}
          <time dateTime={booking.checkOutDate}>
            {stayDate(booking.checkOutDate)}
          </time>
        </p>
        <p>
          {booking.numberOfGuests}{' '}
          {booking.numberOfGuests === 1 ? 'guest' : 'guests'} ·{' '}
          {bookingNights(booking)}{' '}
          {bookingNights(booking) === 1 ? 'night' : 'nights'}
        </p>
        <span
          className={styles.badge}
          data-status={booking.holdExpired ? 'EXPIRED' : booking.status}
        >
          {bookingStatus(booking)}
        </span>
      </div>
      <div className={styles.actions}>
        <strong>{bookingPrice(booking)}</strong>
        <span>Total stay price</span>
        {!detail && (
          <>
            <Link
              className="button button-blue"
              href={`/profile/bookings/${booking.bookingId}`}
            >
              View details
            </Link>
            {booking.status === 'CONFIRMED' &&
              booking.category === 'upcoming' && (
                <Link
                  className={styles.back}
                  href={`/profile/bookings/${booking.bookingId}#manage-booking`}
                >
                  Change or cancel
                </Link>
              )}
          </>
        )}
      </div>
    </article>
  );
}
