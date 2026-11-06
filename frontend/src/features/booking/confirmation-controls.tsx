'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cancelPayment, resumePayment } from './payment-actions';
import { submitPayHere } from './payhere-checkout';
import type { PaymentStatus } from './payment';
import styles from './booking.module.css';

export function ConfirmationControls({ status }: { status: PaymentStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const busy = useRef(false);
  const payable =
    status.status === 'PENDING' && status.paymentState === 'PENDING';
  const needsRefresh =
    status.status === 'PENDING' ||
    status.verificationDelayed ||
    status.paymentState === 'REVIEW_REQUIRED' ||
    status.refundStatus === 'PENDING';
  return (
    <div
      className={styles.controls}
      role="group"
      aria-label="Booking actions"
      aria-busy={pending}
    >
      {status.status === 'CONFIRMED' && (
        <Link
          className="button button-gold"
          href={`/profile/bookings/${status.bookingId}#manage-booking`}
        >
          Manage booking
        </Link>
      )}
      {needsRefresh && (
        <button
          type="button"
          className="button button-outline"
          disabled={pending}
          onClick={() => {
            startTransition(() => router.refresh());
          }}
        >
          {pending ? 'Checking status…' : 'Refresh payment status'}
        </button>
      )}
      {payable && (
        <>
          <button
            type="button"
            className="button button-gold"
            disabled={pending}
            onClick={() => {
              if (busy.current) return;
              busy.current = true;
              setError('');
              startTransition(async () => {
                try {
                  const result = await resumePayment(
                    status.bookingId,
                    status.paymentOption || 'FULL',
                  );
                  if (result.checkout) submitPayHere(result.checkout);
                  else {
                    setError(
                      result.error || 'Please refresh to check payment status.',
                    );
                    router.refresh();
                  }
                } catch {
                  setError(
                    'The payment service could not be reached. Keep this reference and retry.',
                  );
                } finally {
                  busy.current = false;
                }
              });
            }}
          >
            Resume existing checkout
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={pending}
            onClick={() => {
              if (busy.current) return;
              busy.current = true;
              setError('');
              startTransition(async () => {
                try {
                  const result = await cancelPayment(status.bookingId);
                  if (result.error) setError(result.error);
                  router.refresh();
                } catch {
                  setError(
                    'Cancellation could not be verified. Refresh status before retrying.',
                  );
                } finally {
                  busy.current = false;
                }
              });
            }}
          >
            Cancel unpaid checkout
          </button>
        </>
      )}
      <button
        type="button"
        className="button button-outline"
        onClick={() => window.print()}
      >
        Print booking details
      </button>
      {status.status !== 'CONFIRMED' && (
        <Link
          className="button button-outline"
          href={`/profile/bookings/${status.bookingId}`}
        >
          Booking details
        </Link>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
