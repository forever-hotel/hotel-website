import Link from 'next/link';
import type { RoomType } from '../catalogue';
import { roomPrice } from '../catalogue';
import { RoomImage } from './room-image';
import styles from '../rooms.module.css';

export function RoomCard({
  room,
  comparison,
  availability,
  bookingHref,
}: {
  room: RoomType;
  availability?: string;
  bookingHref?: string;
  comparison?: { selected: boolean; disabled: boolean; onToggle: () => void };
}) {
  return (
    <article className={styles.card}>
      <RoomImage
        key={room.imageUrls[0] || 'missing'}
        source={room.imageUrls[0]}
        name={room.typeName}
      />
      <div className={styles.cardCopy}>
        {comparison && (
          <label className={styles.compareChoice}>
            <input
              type="checkbox"
              checked={comparison.selected}
              disabled={comparison.disabled}
              onChange={comparison.onToggle}
              aria-describedby="comparison-help"
            />
            Compare {room.typeName}
          </label>
        )}
        <p className={styles.availability}>
          {availability || 'Availability: check dates'}
        </p>
        <h3>{room.typeName}</h3>
        <p className={styles.description}>
          {room.description ||
            'Contact the hotel for more information about this room.'}
        </p>
        <p className={styles.capacity}>Up to {room.maxGuests} guests</p>
        <ul
          className={styles.amenities}
          aria-label={`${room.typeName} amenities`}
        >
          {room.amenities.slice(0, 4).map((amenity, index) => (
            <li key={`${amenity}-${index}`}>{amenity}</li>
          ))}
        </ul>
        <details className={styles.details}>
          <summary>Room details</summary>
          <p>
            {room.description ||
              'Further room information is not available yet.'}
          </p>
          <p>Maximum occupancy: {room.maxGuests} guests.</p>
          <p>
            Amenities:{' '}
            {room.amenities.length
              ? room.amenities.join(', ')
              : 'Please ask the hotel about amenities.'}
          </p>
          <p>Choose your stay dates to check availability and begin booking.</p>
        </details>
        <div className={styles.rate}>
          <p>
            <span>{roomPrice(room)}</span>
            <small>per night · LKR</small>
          </p>
          <Link
            className="button button-blue"
            href={
              bookingHref ||
              `/booking?roomTypeId=${room.roomTypeId}&step=select`
            }
            aria-label={`Select ${room.typeName} for your stay`}
          >
            {bookingHref ? 'Select room' : 'Check dates'}
          </Link>
        </div>
      </div>
    </article>
  );
}
