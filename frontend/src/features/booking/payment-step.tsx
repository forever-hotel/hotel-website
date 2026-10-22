'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { Quote } from './booking';
import { money } from './booking';
import { getPaymentOptions, startStripePayment } from './payment-actions';
import type { PaymentOption, PaymentOptions } from './payment';
import styles from './booking.module.css';

export function PaymentStep({
  quote,
  requests,
}: {
  quote: Quote;
  requests: string;
}) {
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [option, setOption] = useState<PaymentOption>('FULL');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  useEffect(() => {
    startTransition(async () => {
      setOptions(await getPaymentOptions());
    });
  }, []);
  return (
    <section aria-label="Secure payment">
      <p>
        You will enter card details on Stripe&apos;s secure test checkout. No
        payment has been taken and no room has been reserved yet.
      </p>
      {options === null ? (
        <p role="status">Checking payment availability…</p>
      ) : !options.available ? (
        <p role="alert" className={styles.error}>
          Online payment is not available yet. Contact the hotel, or retry after
          checkout is configured.
        </p>
      ) : (
        <>
          <p>
            Starting checkout holds the room for {options.checkoutMinutes}{' '}
            minutes. Availability is checked again before taking the hold.
          </p>
          <label>
            <input
              type="radio"
              name="paymentOption"
              checked={option === 'FULL'}
              onChange={() => setOption('FULL')}
              disabled={pending}
            />
            Pay in full: {money(quote.totalAmount)}
          </label>
          {options.depositPercent && (
            <label>
              <input
                type="radio"
                name="paymentOption"
                checked={option === 'DEPOSIT'}
                onChange={() => setOption('DEPOSIT')}
                disabled={pending}
              />
              Pay a {options.depositPercent}% advance deposit. The backend will
              calculate the exact amount; the remainder is due later.
            </label>
          )}
          {!options.depositPercent && (
            <p>Full payment only. Advance deposits are not enabled.</p>
          )}
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
                  const result = await startStripePayment(
                    quote.quoteId,
                    quote.quoteToken,
                    requests,
                    option,
                  );
                  if (result.bookingId) {
                    const recovery = `/booking/confirmation?bookingId=${result.bookingId}`;
                    // Back from Stripe returns to the same durable checkout, never a fresh hold.
                    window.history.replaceState(null, '', recovery);
                    window.location.assign(result.checkoutUrl || recovery);
                  } else setError(result.error || 'Checkout could not start.');
                } catch {
                  setError(
                    'Checkout could not be reached. Reload to recover your attempt.',
                  );
                } finally {
                  busy.current = false;
                }
              });
            }}
          >
            {pending
              ? 'Preparing secure checkout…'
              : 'Continue to Stripe test checkout'}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}
