'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { requestPasswordReset, resetPassword } from '../password-reset-actions';
import styles from '../auth.module.css';

export function PasswordResetForm({ reset = false }: { reset?: boolean }) {
  const [token, setToken] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [state, action, pending] = useActionState(
    reset ? resetPassword : requestPasswordReset,
    {},
  );
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    const frame = window.requestAnimationFrame(() => {
      setToken(value);
      setLoaded(true);
      if (reset && window.location.hash)
        window.history.replaceState(null, '', window.location.pathname);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reset]);
  useEffect(() => {
    if (state.error || state.message) feedback.current?.focus();
  }, [state]);
  if (reset && loaded && !token)
    return (
      <p role="alert">
        This reset link is missing or invalid.{' '}
        <Link href="/forgot-password">Request a new link</Link>.
      </p>
    );
  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      {state.error && (
        <p role="alert" tabIndex={-1} ref={feedback} className={styles.error}>
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" tabIndex={-1} ref={feedback}>
          {state.message}
        </p>
      )}
      {!state.done && (
        <>
          {reset ? (
            <>
              <input type="hidden" name="token" value={token} />
              <label>
                New password (required)
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  aria-describedby="reset-password-help"
                />
              </label>
              <p id="reset-password-help">
                Use at least 8 characters and at most 72 UTF-8 bytes.
              </p>
              <label>
                Confirm new password (required)
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                />
              </label>
            </>
          ) : (
            <label>
              Email address (required)
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
              />
            </label>
          )}
          <button
            className="button button-blue"
            type="submit"
            disabled={pending || (reset && !loaded)}
          >
            {pending
              ? 'Please wait…'
              : reset
                ? 'Change password'
                : 'Send reset link'}
          </button>
        </>
      )}
      {reset && !state.done && (
        <Link href="/forgot-password">Request a new reset link</Link>
      )}
      <Link href="/sign-in">Back to sign in</Link>
    </form>
  );
}
