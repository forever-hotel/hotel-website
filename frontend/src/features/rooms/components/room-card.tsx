import Link from 'next/link';
import type { RoomType } from '../catalogue';
import { roomPrice } from '../catalogue';
import { RoomImage } from './room-image';
import styles from '../rooms.module.css';

export function RoomCard({ room }: { room: RoomType }) {
  return (
    <article className={styles.card}>
      <RoomImage
        key={room.imageUrls[0] || 'missing'}
        source={room.imageUrls[0]}
        name={room.typeName}
      />
      <div className={styles.cardCopy}>
        <p className={styles.availability}>Availability: check dates</p>
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
          <p>
            Live availability and online booking are coming soon. Please contact
            the hotel about your dates.
          </p>
        </details>
        <div className={styles.rate}>
          <p>
            <span>{roomPrice(room)}</span>
            <small>per night � LKR</small>
          </p>
          <Link
            className="button button-blue"
            href="/contact"
            aria-label={`Contact the hotel about ${room.typeName}`}
          >
            Enquire
          </Link>
        </div>
      </div>
    </article>
  );
}
