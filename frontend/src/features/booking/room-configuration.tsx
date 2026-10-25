import type { RoomType } from '../rooms/catalogue';
import Link from 'next/link';
import { RoomImage } from '../rooms/components/room-image';
import styles from './booking.module.css';
export function RoomConfiguration({
  rooms,
  selectedId,
  pending,
  onSelect,
  onContinue,
}: {
  rooms: RoomType[];
  selectedId: string;
  pending: boolean;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <>
      <h2>Choose your room</h2>
      <div className={styles.choices}>
        {rooms.map((item) => (
          <article
            key={item.roomTypeId}
            className={
              item.roomTypeId === selectedId ? styles.selected : styles.choice
            }
          >
            <RoomImage source={item.imageUrls[0]} name={item.typeName} />
            <h3>{item.typeName}</h3>
            <p>{item.description}</p>
            <p>Up to {item.maxGuests} guests</p>
            <button
              type="button"
              className="button button-outline"
              disabled={pending}
              aria-pressed={item.roomTypeId === selectedId}
              onClick={() => onSelect(item.roomTypeId)}
            >
              {item.roomTypeId === selectedId ? '✓ Selected' : 'Select room'}
            </button>
          </article>
        ))}
      </div>
      <p>
        Room quantity: 1. Multiple rooms, child-specific pricing, meal plans and
        arrival options are not available online yet.
      </p>
      <p>
        Promotion codes cannot be applied online yet.{' '}
        <Link href="/offers">View current offers</Link> or contact the hotel
        about eligibility. No discount is included unless shown in your backend
        quote.
      </p>
      <button
        type="button"
        className="button button-blue"
        disabled={pending}
        onClick={onContinue}
      >
        {pending ? 'Checking room and price…' : 'Check price and continue'}
      </button>
    </>
  );
}
