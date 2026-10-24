import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { guestRequest } from '@/features/bookings/api';
import { BookingCard } from '@/features/bookings/booking-card';
import { isBookingId, parseBookingDetail } from '@/features/bookings/dashboard';
import styles from '@/features/bookings/dashboard.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Booking details | Forever City Hotel',
  robots: { index: false, follow: false },
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const token = (await cookies()).get('hw_guest_session')?.value;
  const login = `/sign-in?returnTo=${encodeURIComponent(`/profile/bookings/${bookingId}`)}`;
  if (!token) redirect(login);
  if (!isBookingId(bookingId)) notFound();
  let booking: ReturnType<typeof parseBookingDetail> | null = null;
  let status = 503;
  try {
    const response = await guestRequest(token, `/bookings/${bookingId}`);
    status = response.status;
    if (response.ok)
      booking = parseBookingDetail(await response.json(), bookingId);
  } catch {
    /* Preserve the reference and provide a retry path during an outage. */
  }
  if (status === 401) redirect(`${login}&expired=1`);
  if (status === 404) notFound();
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.detail}>
        <Link href="/profile" className={styles.back}>
          Back to My Bookings
        </Link>
        <h1>Booking details</h1>
        {booking ? (
          <>
            <BookingCard booking={booking} detail />
            <section>
              <h2>Special requests</h2>
              <p className={styles.requests}>
                {booking.specialRequests || 'No special requests supplied.'}
              </p>
              <p>
                Requests are subject to availability and hotel confirmation.
              </p>
            </section>
            {booking.category === 'upcoming' && (
              <section>
                <h2>Reservation and payment status</h2>
                <p>
                  <Link
                    className="button button-blue"
                    href={`/booking/confirmation?bookingId=${bookingId}`}
                  >
                    Review booking status
                  </Link>
                </p>
              </section>
            )}
          </>
        ) : (
          <div role="alert" className={styles.message}>
            <h2>Booking details could not be loaded</h2>
            <p>
              <Link href={`/profile/bookings/${bookingId}`}>Try again</Link>.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
