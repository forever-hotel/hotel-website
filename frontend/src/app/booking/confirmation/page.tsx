import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { readPaymentStatus } from '@/features/booking/payments-api';
import {
  confirmationEmailMessage,
  paymentHeading,
  validBookingId,
} from '@/features/booking/payment';
import type { PaymentStatus } from '@/features/booking/payment';
import { money } from '@/features/booking/booking';
import { ConfirmationControls } from '@/features/booking/confirmation-controls';
import { RoomImage } from '@/features/rooms/components/room-image';
import { safeRoomImage } from '@/config/room-images';
import styles from '@/features/booking/booking.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Booking status | Forever City Hotel',
  robots: { index: false, follow: false },
};
export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const id = typeof params.bookingId === 'string' ? params.bookingId : '';
  const login = `/sign-in?returnTo=${encodeURIComponent(`/booking/confirmation?bookingId=${encodeURIComponent(id)}`)}`;
  const token = (await cookies()).get('hw_guest_session')?.value;
  if (!token) redirect(login);
  let status: PaymentStatus | null = null;
  if (validBookingId(id)) {
    try {
      status = await readPaymentStatus(process.env.API_GATEWAY_URL, token, id);
    } catch {
      /* Keep reference for recovery without claiming success. */
    }
  }
  const confirmed =
    status &&
    status.paymentState !== 'REVIEW_REQUIRED' &&
    ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(status.status) &&
    status.paidAmount > 0;
  return (
    <>
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className={`${styles.page} ${styles.confirmation}`}
      >
        <header className={styles.heading}>
          <p className="eyebrow">Forever City Hotel</p>
          <h1>
            {status ? paymentHeading(status) : 'Booking status unavailable'}
          </h1>
          <p>Booking reference: {id || 'Not supplied'}</p>
          {!status && (
            <p role="alert" className={styles.error}>
              We could not verify this booking.{' '}
              <Link href={login}>Sign in again</Link> or retry. A payment
              redirect does not confirm a reservation.
            </p>
          )}
        </header>
        {status && (
          <>
            <nav className={styles.progress} aria-label="Booking progress">
              <ol>
                {[
                  'Select Room',
                  'Room Details',
                  'Guest Info',
                  'Payment',
                  'Confirmation',
                ].map((label, index) => (
                  <li
                    key={label}
                    aria-current={
                      index === (confirmed ? 4 : 3) ? 'step' : undefined
                    }
                  >
                    {label}
                  </li>
                ))}
              </ol>
            </nav>
            <div className={styles.columns}>
              <section className={styles.panel}>
                <h2>{status.roomType}</h2>
                <RoomImage
                  source={
                    status.roomImage
                      ? safeRoomImage(status.roomImage) || undefined
                      : undefined
                  }
                  name={status.roomType}
                />
                {status.guestName && <p>Guest: {status.guestName}</p>}
                {status.guestEmail && <p>Email: {status.guestEmail}</p>}
                {status.specialRequests && (
                  <p>Special requests: {status.specialRequests}</p>
                )}
                <p>Status: {status.status}</p>
                <p>Check-in: {status.checkInDate}</p>
                <p>Check-out: {status.checkOutDate}</p>
                <p>
                  {status.priceSnapshot.nights} nights · {status.numberOfGuests}{' '}
                  guests · 1 room
                </p>
                {status.paymentState === 'REVIEW_REQUIRED' ? (
                  <p role="alert">
                    Your payment requires hotel review. Contact the hotel with
                    your booking reference before making another payment.
                  </p>
                ) : confirmed ? (
                  <p role="status">
                    Your reservation is confirmed from verified payment data.
                  </p>
                ) : (
                  <p role="status">
                    Your stay is not confirmed. Refresh payment status before
                    making another payment.
                  </p>
                )}
                {status.verificationDelayed && (
                  <p role="alert">
                    Payment verification is delayed. These are the last recorded
                    details; keep your reference and retry.
                  </p>
                )}
                {status.refundStatus && (
                  <p>
                    Refund status: {status.refundStatus}. An expired or
                    cancelled hold cannot be confirmed by a late payment.
                  </p>
                )}
                {!confirmed && status.holdExpiresAt && (
                  <p>
                    Hold deadline:{' '}
                    {new Date(status.holdExpiresAt).toLocaleString('en-LK', {
                      timeZone: 'Asia/Colombo',
                    })}{' '}
                    (Asia/Colombo).
                  </p>
                )}
                <p>
                  PDF download is not available yet. Use Print booking details
                  to print or save this view.
                </p>
                <p>
                  Booking changes and cancellation of a confirmed stay will be
                  available through booking management.{' '}
                  <Link href="/contact">Contact the hotel</Link> for assistance.
                </p>
                <p>{confirmationEmailMessage(status.emailStatus)}</p>
                <ConfirmationControls status={status} />
              </section>
              <aside
                className={styles.summary}
                aria-label="Verified payment summary"
              >
                <h2>Payment summary</h2>
                <p>
                  {status.priceSnapshot.nights} nights ×{' '}
                  {money(status.priceSnapshot.nightlyRate)}
                </p>
                <dl>
                  <dt>Room subtotal</dt>
                  <dd>{money(status.priceSnapshot.subtotal)}</dd>
                  {status.priceSnapshot.lineItems.map((line) => (
                    <div key={line.code}>
                      <dt>{line.label}</dt>
                      <dd>{money(line.amount)}</dd>
                    </div>
                  ))}
                  <dt>Total</dt>
                  <dd>{money(status.totalAmount)}</dd>
                  <dt>Paid</dt>
                  <dd>{money(status.paidAmount)}</dd>
                  <dt>Balance</dt>
                  <dd>
                    {status.paymentState === 'REVIEW_REQUIRED'
                      ? 'Under hotel review'
                      : money(status.balanceAmount)}
                  </dd>
                </dl>
                <p>Currency: {status.currency}</p>
                <p>
                  Payment reference:{' '}
                  {status.paymentReference || 'Awaiting provider session'}
                </p>
                <p>
                  Card details are handled by the payment provider and are not
                  stored here.
                </p>
              </aside>
            </div>
          </>
        )}
        <div className={styles.heading}>
          <Link href="/rooms">Browse rooms</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
