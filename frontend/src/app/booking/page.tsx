import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { getRoomCatalogue } from '@/features/rooms/catalogue';
import { BookingFlow } from '@/features/booking/booking-flow';
import { paymentRequest } from '@/features/booking/payments-api';
import { validBookingId } from '@/features/booking/payment';
import styles from '@/features/booking/booking.module.css';

export const metadata = {
  title: 'Book your stay | Forever City Hotel',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const safeParams = new URLSearchParams();
  for (const key of [
    'roomTypeId',
    'checkInDate',
    'checkOutDate',
    'numberOfGuests',
    'step',
  ]) {
    if (typeof params[key] === 'string') safeParams.set(key, params[key]);
  }
  const returnTo = `/booking?${safeParams}`;
  const login = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  const token = (await cookies()).get('hw_guest_session')?.value;
  if (!token) redirect(login);
  const recoveryQuote = (await cookies()).get('hw_checkout_preview')?.value;
  let recoverTo = '';
  let recoveryUnavailable = false;
  let recoveryExpired = false;
  if (recoveryQuote && validBookingId(recoveryQuote)) {
    try {
      const response = await paymentRequest(
        process.env.API_GATEWAY_URL,
        token,
        `/recovery/${recoveryQuote}`,
      );
      recoveryExpired = response.status === 401;
      if (!response.ok) throw new Error('Recovery unavailable');
      const result = await response.json();
      if (
        typeof result?.bookingId === 'string' &&
        validBookingId(result.bookingId)
      )
        recoverTo = `/booking/confirmation?bookingId=${result.bookingId}`;
    } catch {
      recoveryUnavailable = true;
    }
  }
  if (recoveryExpired) redirect(login);
  if (recoverTo) redirect(recoverTo);
  let guest: { fullName: string; email: string } | null = null;
  let expired = false;
  const catalogue = await getRoomCatalogue();
  try {
    const base = process.env.API_GATEWAY_URL;
    if (!base) throw new Error('Not configured');
    const response = await fetch(`${base.replace(/\/$/, '')}/hw/guests/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    expired = response.status === 401;
    if (response.ok) {
      const data = await response.json();
      if (typeof data?.fullName === 'string' && typeof data?.email === 'string')
        guest = { fullName: data.fullName, email: data.email };
    }
  } catch {
    /* Keep stay parameters available for retry. */
  }
  if (expired) redirect(login);
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        {!recoveryUnavailable &&
        guest &&
        catalogue.state === 'ready' &&
        catalogue.rooms.length ? (
          <BookingFlow rooms={catalogue.rooms} guest={guest} />
        ) : (
          <section className={styles.panel}>
            <h1>Book your stay</h1>
            <p role="alert" className={styles.error}>
              {recoveryUnavailable
                ? 'An earlier checkout could not be checked. Retry recovery before starting another payment.'
                : 'Your account or rooms could not be loaded.'}
            </p>
            <Link href={returnTo}>Try again</Link>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
