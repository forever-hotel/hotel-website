import Link from 'next/link';
import styles from '@/features/bookings/dashboard.module.css';

export default function BookingNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.detail}>
      <h1>Booking not found</h1>
      <p>This reservation is unavailable for your account.</p>
      <Link href="/profile" className={styles.back}>
        Back to My Bookings
      </Link>
    </main>
  );
}
