import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { AuthForm } from './auth-form';
import { safeReturn } from '../validation';
import styles from '../auth.module.css';

export function AuthPage({
  register,
  returnTo,
  registered,
  expired,
}: {
  register: boolean;
  returnTo: unknown;
  registered?: boolean;
  expired?: boolean;
}) {
  const destination = safeReturn(returnTo);
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.layout}>
        <section
          className={styles.photo}
          aria-label="Forever City Hotel guest welcome"
        >
          <Image
            src="/images/forever-city-room-enhanced.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <div>
            <p className="eyebrow">
              {register ? 'Join the story' : 'Your stay starts here'}
            </p>
            <h1>
              {register ? (
                <>
                  Create your <em>account</em>
                </>
              ) : (
                <>
                  Welcome <em>back</em>
                </>
              )}
            </h1>
            <p>Make yourself at home at Forever City Hotel.</p>
            <ul>
              <li>Explore our rooms and amenities</li>
              <li>Find dates for your next stay</li>
              <li>Continue your visit with a guest account</li>
            </ul>
            <small>Photograph is AI-enhanced.</small>
          </div>
        </section>
        <section className={styles.panel} aria-labelledby="auth-title">
          <div>
            <p className="eyebrow">
              {register ? 'New member' : 'Guest portal'}
            </p>
            <h2 id="auth-title">{register ? 'Create account' : 'Sign in'}</h2>
            <p>
              {register
                ? 'Enter your details to register as a guest.'
                : 'Sign in with your email and password.'}
            </p>
            {registered && (
              <p role="status">
                Your account was created. Please sign in to continue.
              </p>
            )}
            {expired && (
              <p role="status">
                Your session has expired or is invalid. Please sign in again.
              </p>
            )}
            <AuthForm register={register} returnTo={destination} />
            <p>
              {register
                ? 'Already have an account?'
                : 'New to Forever City Hotel?'}{' '}
              <Link
                href={`${register ? '/sign-in' : '/sign-up'}?returnTo=${encodeURIComponent(destination)}`}
              >
                {register ? 'Sign in' : 'Create account'}
              </Link>
            </p>
            {!register && (
              <p className={styles.note}>
                Social sign-in and password recovery are not available yet.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
