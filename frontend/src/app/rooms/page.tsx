import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { getRoomCatalogue } from '@/features/rooms/catalogue';
import { RoomCard } from '@/features/rooms/components/room-card';
import styles from '@/features/rooms/rooms.module.css';

export const metadata: Metadata = {
  title: 'Rooms & Suites | Forever City Hotel',
  description:
    'Explore room types, amenities, guest capacity and nightly rates at Forever City Hotel, Kiribathgoda.',
};
export const dynamic = 'force-dynamic';

type RoomsPageProps = {
  searchParams: Promise<{ roomTypeId?: string | string[] }>;
};

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const { roomTypeId } = await searchParams;
  const catalogue = await getRoomCatalogue();
  const selected = typeof roomTypeId === 'string' ? roomTypeId : '';
  if (
    catalogue.state === 'ready' &&
    roomTypeId &&
    (Array.isArray(roomTypeId) ||
      !catalogue.rooms.some((room) => room.roomTypeId === selected))
  )
    notFound();
  const rooms = selected
    ? catalogue.rooms.filter((room) => room.roomTypeId === selected)
    : catalogue.rooms;

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="rooms-page-title">
          <Image
            src="/images/forever-city-room-enhanced.webp"
            alt=""
            fill
            preload
            sizes="100vw"
          />
          <div>
            <p className="eyebrow">Accommodations</p>
            <h1 id="rooms-page-title">
              Rooms & <em>Suites</em>
            </h1>
            <p>Find a space to make your own.</p>
            <small>Banner photograph is AI-enhanced.</small>
          </div>
        </section>
        <section className={styles.filters} aria-label="Room filters">
          <form action="/rooms" method="get">
            <label htmlFor="room-type">Room type</label>
            <select
              id="room-type"
              name="roomTypeId"
              defaultValue={selected}
              disabled={catalogue.state !== 'ready'}
            >
              <option value="">All rooms</option>
              {catalogue.rooms.map((room) => (
                <option value={room.roomTypeId} key={room.roomTypeId}>
                  {room.typeName}
                </option>
              ))}
            </select>
            <button
              className="button button-gold"
              disabled={catalogue.state !== 'ready'}
            >
              Search
            </button>
            {selected && <Link href="/rooms">Clear filter</Link>}
          </form>
          <p>
            Availability: <strong>Check dates</strong>. Live date search is
            coming soon; displayed rooms are not guaranteed available.
          </p>
        </section>
        <div className={styles.compareBar}>
          <p>Room comparison is coming soon.</p>
          <button className="button button-outline" disabled>
            Compare rooms
          </button>
        </div>
        <section className={styles.catalogue} aria-labelledby="catalogue-title">
          <p className={styles.eyebrow}>A space prepared for your stay</p>
          <h2 id="catalogue-title">Explore Our Rooms</h2>
          {catalogue.state === 'unavailable' ? (
            <p className={styles.feedback}>
              Rooms are temporarily unavailable.{' '}
              <Link href="/rooms">Try again</Link> or{' '}
              <Link href="/contact">contact the hotel</Link>.
            </p>
          ) : rooms.length === 0 ? (
            <p className={styles.feedback}>
              There are no room types to show right now. Please check back soon.
            </p>
          ) : (
            <>
              <p className={styles.resultCount}>
                {rooms.length} room {rooms.length === 1 ? 'type' : 'types'}
              </p>
              <div className={styles.grid}>
                {rooms.map((room) => (
                  <RoomCard key={room.roomTypeId} room={room} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
