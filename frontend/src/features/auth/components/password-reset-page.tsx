import { SiteHeader } from '@/components/layout/site-header';
import { PasswordResetForm } from './password-reset-form';
import styles from '../auth.module.css';

export function PasswordResetPage({ reset = false }: { reset?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.panel} aria-labelledby="reset-title">
          <div>
            <p className="eyebrow">Guest account</p>
            <h1 id="reset-title">
              {reset ? 'Choose a new password' : 'Forgot your password?'}
            </h1>
            <p>
              {reset
                ? 'Enter and confirm your new password below.'
                : 'Enter your account email to receive a password reset link.'}
            </p>
            <PasswordResetForm reset={reset} />
          </div>
        </section>
      </main>
    </>
  );
}
