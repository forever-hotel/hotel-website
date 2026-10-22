'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { signIn, signUp } from '../actions';
import styles from '../auth.module.css';

export function AuthForm({
  register,
  returnTo,
}: {
  register: boolean;
  returnTo: string;
}) {
  const [state, action, pending] = useActionState(
    register ? signUp : signIn,
    {},
  );
  const [clientError, setClientError] = useState('');
  const alert = useRef<HTMLParagraphElement>(null);
  const error = pending ? '' : clientError || state.error;

  useEffect(() => {
    if (clientError || state.error) {
      alert.current?.focus();
      alert.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [clientError, state]);

  return (
    <form
      action={action}
      className={styles.form}
      aria-busy={pending}
      noValidate
      aria-describedby={error ? 'auth-error' : undefined}
      onSubmit={(event) => {
        const invalid = Array.from(event.currentTarget.elements).find(
          (element): element is HTMLInputElement =>
            element instanceof HTMLInputElement && !element.validity.valid,
        );
        if (invalid) {
          event.preventDefault();
          setClientError(
            `${invalid.labels?.[0]?.textContent?.trim() || 'Details'}: ${invalid.validationMessage}`,
          );
          // Repeated submissions can have identical text; still reveal the alert.
          alert.current?.focus();
          alert.current?.scrollIntoView({ block: 'nearest' });
          return;
        }
        setClientError('');
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {register && (
        <div className={styles.names}>
          <label>
            First name
            <input
              name="firstName"
              autoComplete="given-name"
              required
              maxLength={255}
            />
          </label>
          <label>
            Last name
            <input
              name="lastName"
              autoComplete="family-name"
              required
              maxLength={255}
            />
          </label>
        </div>
      )}
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={register ? 'new-password' : 'current-password'}
          required
          minLength={register ? 8 : undefined}
          maxLength={72}
          aria-describedby={register ? 'password-help' : undefined}
        />
      </label>
      {register && (
        <>
          <p id="password-help">
            Use at least 8 characters. Passwords are limited to 72 UTF-8 bytes.
          </p>
          <label>
            Confirm password
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
      )}
      {error && (
        <p
          id="auth-error"
          ref={alert}
          role="alert"
          tabIndex={-1}
          className={styles.error}
        >
          {error}
        </p>
      )}
      <button type="submit" className="button button-blue" disabled={pending}>
        {pending ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
