import Link from 'next/link';
import { getRoomCatalogue } from '../catalogue';
import { RoomCard } from './room-card';
import styles from '../rooms.module.css';

export async function RoomPreview() {
  const catalogue = await getRoomCatalogue();
  if (catalogue.state === 'unavailable')
    return (
      <p className={styles.feedback}>
        Rooms are temporarily unavailable.{' '}
        <Link href="/rooms">Try the room catalogue again</Link>.
      </p>
    );
  if (!catalogue.rooms.length)
    return (
      <p className={styles.feedback}>
        There are no room types to show right now. Please check back soon.
      </p>
    );
  return (
    <div className={styles.grid}>
      {catalogue.rooms.slice(0, 3).map((room) => (
        <RoomCard room={room} key={room.roomTypeId} />
      ))}
    </div>
  );
}
