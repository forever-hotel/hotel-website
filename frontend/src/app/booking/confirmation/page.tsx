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
          <p className={styles.bookingReference}>
            Reference <span>{id || 'Not supplied'}</span>
          </p>
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
            <div className={styles.columns}>
              <section className={styles.panel}>
                <h2>{status.roomType}</h2>
                {status.roomImage && safeRoomImage(status.roomImage) && (
                  <div className={styles.confirmationImage}>
                    <RoomImage
                      source={safeRoomImage(status.roomImage) || undefined}
                      name={status.roomType}
                    />
                  </div>
                )}
                <div
                  className={styles.statusNotice}
                  role={
                    status.verificationDelayed ||
                    status.paymentState === 'REVIEW_REQUIRED'
                      ? 'alert'
                      : 'status'
                  }
                >
                  <span className={styles.statusBadge}>
                    {status.paymentState === 'REVIEW_REQUIRED'
                      ? 'Needs review'
                      : confirmed
                        ? 'Confirmed'
                        : status.status === 'CANCELLED' ||
                            status.paymentState === 'EXPIRED'
                          ? 'Closed'
                          : 'Awaiting payment'}
                  </span>
                  <p>
                    {status.paymentState === 'REVIEW_REQUIRED'
                      ? 'Contact the hotel before making another payment.'
                      : status.verificationDelayed
                        ? 'Payment verification is delayed. Refresh the status before paying again.'
                        : confirmed
                          ? 'Your reservation is confirmed.'
                          : status.status === 'CANCELLED' ||
                              status.paymentState === 'EXPIRED'
                            ? 'This checkout is closed. Choose new dates to book again.'
                            : 'Your room is awaiting payment. Complete checkout to confirm your stay.'}
                  </p>
                </div>
                <dl className={styles.reservationFacts}>
                  <div>
                    <dt>Check-in</dt>
                    <dd>
                      {new Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'medium',
                        timeZone: 'Asia/Colombo',
                      }).format(
                        new Date(status.checkInDate + 'T12:00:00+05:30'),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Check-out</dt>
                    <dd>
                      {new Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'medium',
                        timeZone: 'Asia/Colombo',
                      }).format(
                        new Date(status.checkOutDate + 'T12:00:00+05:30'),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Stay</dt>
                    <dd>
                      {status.priceSnapshot.nights}{' '}
                      {status.priceSnapshot.nights === 1 ? 'night' : 'nights'}{' '}
                      &middot; {status.numberOfGuests}{' '}
                      {status.numberOfGuests === 1 ? 'guest' : 'guests'}{' '}
                      &middot; 1 room
                    </dd>
                  </div>
                  {status.guestName && (
                    <div>
                      <dt>Guest</dt>
                      <dd>{status.guestName}</dd>
                    </div>
                  )}
                </dl>
                {!confirmed &&
                  status.status === 'PENDING' &&
                  status.holdExpiresAt && (
                    <p className={styles.deadline}>
                      Complete checkout by{' '}
                      {new Date(status.holdExpiresAt).toLocaleTimeString(
                        'en-GB',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Colombo',
                        },
                      )}{' '}
                      (Sri Lanka time).
                    </p>
                  )}
                <details className={styles.extraDetails}>
                  <summary>Contact &amp; booking details</summary>
                  {status.guestEmail && <p>{status.guestEmail}</p>}
                  {status.specialRequests && (
                    <div>
                      <h3>Special requests</h3>
                      <p>{status.specialRequests}</p>
                    </div>
                  )}
                  {status.refundStatus && (
                    <p>Refund: {status.refundStatus.toLowerCase()}</p>
                  )}
                  <p>{confirmationEmailMessage(status.emailStatus)}</p>
                  <Link href="/contact">Contact the hotel</Link>
                </details>
                <ConfirmationControls status={status} />
              </section>
              <aside
                className={styles.summary}
                aria-label="Verified payment summary"
              >
                <h2>Payment summary</h2>
                <p>
                  {status.priceSnapshot.nights}{' '}
                  {status.priceSnapshot.nights === 1 ? 'night' : 'nights'} ×{' '}
                  {money(status.priceSnapshot.nightlyRate)}
                </p>
                <dl>
                  <div>
                    <dt>Room subtotal</dt>
                    <dd>{money(status.priceSnapshot.subtotal)}</dd>
                  </div>
                  {status.priceSnapshot.promotion && (
                    <div>
                      <dt>Promotion ({status.priceSnapshot.promotion.code})</dt>
                      <dd>
                        −{money(status.priceSnapshot.discountAmount || 0)}
                      </dd>
                    </div>
                  )}
                  {status.priceSnapshot.lineItems.map((line) => (
                    <div key={line.code}>
                      <dt>{line.label}</dt>
                      <dd>{money(line.amount)}</dd>
                    </div>
                  ))}
                  <div>
                    <dt>Total</dt>
                    <dd>{money(status.totalAmount)}</dd>
                  </div>
                  <div>
                    <dt>Paid</dt>
                    <dd>{money(status.paidAmount)}</dd>
                  </div>
                  <div>
                    <dt>Balance</dt>
                    <dd>
                      {status.paymentState === 'REVIEW_REQUIRED'
                        ? 'Under hotel review'
                        : money(status.balanceAmount)}
                    </dd>
                  </div>
                </dl>
                {status.paymentReference && (
                  <details className={styles.paymentReference}>
                    <summary>Payment reference</summary>
                    <p>{status.paymentReference}</p>
                  </details>
                )}
              </aside>
            </div>
          </>
        )}
        {!status && (
          <div className={styles.heading}>
            <Link className="button button-outline" href="/profile">
              My bookings
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
