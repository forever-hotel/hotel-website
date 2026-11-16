import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import styles from '@/features/rooms/rooms.module.css';

export default function RoomNotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.catalogue}>
        <h1 className={styles.notFoundTitle}>Room type not found</h1>
        <p>The selected room type is not in the current catalogue.</p>
        <Link href="/rooms">View all rooms</Link>
      </main>
      <SiteFooter />
    </>
  );
}
