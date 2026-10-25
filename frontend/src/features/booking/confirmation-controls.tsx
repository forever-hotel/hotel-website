'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className="button button-outline"
        disabled={pending}
        onClick={() => {
          startTransition(() => router.refresh());
        }}
      >
        Refresh payment status
      </button>
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
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
