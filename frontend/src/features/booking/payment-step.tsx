'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Quote } from './booking';
import { money } from './booking';
import { getPaymentOptions, startPayment } from './payment-actions';
import { submitPayHere } from './payhere-checkout';
import type { PaymentOption, PaymentOptions } from './payment';
import styles from './booking.module.css';

export function PaymentStep({
  quote,
  requests,
}: {
  quote: Quote;
  requests: string;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [option, setOption] = useState<PaymentOption>('FULL');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const billingForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    startTransition(async () => {
      setOptions(await getPaymentOptions());
    });
  }, []);
  return (
    <section aria-label="Secure payment">
      <p>
        You will enter payment details on PayHere&apos;s secure checkout. No
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
          {options.sandbox && (
            <p role="status">
              Sandbox checkout: payments are simulated. No real money is
              collected.
            </p>
          )}
          <p>
            Starting checkout holds the room for {options.checkoutMinutes}{' '}
            minutes. Complete payment before the hold expires. A late payment
            requires hotel review and does not reserve the room.
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
          <form
            ref={billingForm}
            aria-label="Billing details"
            onSubmit={(event) => event.preventDefault()}
          >
            <h3>Billing details</h3>
            <p>PayHere requires these details to process your payment.</p>
            {(
              [
                ['firstName', 'First name', 'given-name', 100],
                ['lastName', 'Last name', 'family-name', 100],
                ['phone', 'Phone', 'tel', 20],
                ['address', 'Billing address', 'street-address', 200],
                ['city', 'City', 'address-level2', 100],
                ['country', 'Country', 'country-name', 100],
              ] as const
            ).map(([name, label, autoComplete, maxLength]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  autoComplete={autoComplete}
                  maxLength={maxLength}
                  required
                  type={name === 'phone' ? 'tel' : 'text'}
                  disabled={pending}
                />
              </label>
            ))}
          </form>
          <button
            type="button"
            className="button button-gold"
            disabled={pending}
            onClick={() => {
              if (!billingForm.current?.reportValidity()) return;
              const values = new FormData(billingForm.current);
              const billing = {
                firstName: String(values.get('firstName')).trim(),
                lastName: String(values.get('lastName')).trim(),
                phone: String(values.get('phone')).trim(),
                address: String(values.get('address')).trim(),
                city: String(values.get('city')).trim(),
                country: String(values.get('country')).trim(),
              };
              if (busy.current) return;
              busy.current = true;
              setError('');
              startTransition(async () => {
                try {
                  const result = await startPayment(
                    quote.quoteId,
                    quote.quoteToken,
                    requests,
                    option,
                    billing,
                  );
                  if (result.bookingId) {
                    const recovery = `/booking/confirmation?bookingId=${result.bookingId}`;
                    // Browser Back recovers the same durable checkout.
                    window.history.replaceState(null, '', recovery);
                    if (result.checkout) submitPayHere(result.checkout);
                    else router.push(recovery);
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
              : 'Continue to PayHere checkout'}
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
