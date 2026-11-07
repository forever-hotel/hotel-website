'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Quote } from './booking';
import { money } from './booking';
import { getPaymentOptions, startPayment } from './payment-actions';
import { submitPayHere } from './payhere-checkout';
import type { PaymentOption, PaymentOptions } from './payment';
import styles from './booking.module.css';
import { billingDefaults } from './billing';
import type { CheckoutGuest } from './billing';

export function PaymentStep({
  quote,
  requests,
  guest,
}: {
  quote: Quote;
  requests: string;
  guest: CheckoutGuest;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [option, setOption] = useState<PaymentOption>('FULL');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const billingForm = useRef<HTMLFormElement>(null);
  const defaults = billingDefaults(guest);
  useEffect(() => {
    startTransition(async () => {
      setOptions(await getPaymentOptions());
    });
  }, []);
  return (
    <section aria-label="Secure payment" className={styles.payment}>
      <p>Pay securely with PayHere.</p>
      {options === null ? (
        <p role="status">Checking payment availability…</p>
      ) : !options.available ? (
        <p role="alert" className={styles.error}>
          Online payment is temporarily unavailable. Please try again or contact
          the hotel for assistance.
        </p>
      ) : (
        <>
          <p>
            Complete payment within {options.checkoutMinutes} minutes to confirm
            your reservation.
          </p>
          {options.depositPercent ? (
            <fieldset className={styles.paymentOptions}>
              <legend>Payment amount</legend>
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
                  Pay a {options.depositPercent}% deposit
                </label>
              )}
            </fieldset>
          ) : (
            <p className={styles.paymentTotal}>
              Amount to pay: <strong>{money(quote.totalAmount)}</strong>
            </p>
          )}
          <form
            ref={billingForm}
            aria-label="Billing details"
            onSubmit={(event) => event.preventDefault()}
          >
            <h3>Billing details</h3>
            <p className={styles.formHint}>
              All billing fields are required. Please check your saved details.
            </p>
            <div className={styles.billingGrid}>
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
                  <span>
                    {label}{' '}
                    <small className={styles.requiredText}>(required)</small>
                  </span>
                  <input
                    name={name}
                    defaultValue={defaults[name]}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    required
                    type={name === 'phone' ? 'tel' : 'text'}
                    minLength={name === 'country' ? 2 : 1}
                    pattern={
                      name === 'phone'
                        ? String.raw`\+?[0-9 \(\)\-]{7,20}`
                        : '.*\\S.*'
                    }
                    disabled={pending}
                  />
                </label>
              ))}
            </div>
          </form>
          <button
            type="button"
            style={{ width: '100%' }}
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
