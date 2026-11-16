'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelPayment } from './payment-actions';

export function PendingCheckoutChoice({
  bookingId,
  returnTo,
}: {
  bookingId: string;
  returnTo: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return (
    <>
      <Link
        className="button button-outline"
        href={`/booking/confirmation?bookingId=${bookingId}`}
      >
        Review previous booking
      </Link>
      <button
        type="button"
        className="button button-gold"
        disabled={pending}
        onClick={() => {
          setError('');
          startTransition(async () => {
            try {
              const result = await cancelPayment(bookingId);
              if (result.error) {
                setError(result.error);
                return;
              }
              router.push(returnTo);
              router.refresh();
            } catch {
              setError(
                'The earlier payment could not be checked. Review its booking before retrying.',
              );
            }
          });
        }}
      >
        {pending
          ? 'Checking previous payment…'
          : 'Cancel unpaid checkout and use new selection'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
