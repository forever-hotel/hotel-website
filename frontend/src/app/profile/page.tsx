import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { signOut } from '@/features/auth/actions';
import styles from '@/features/auth/auth.module.css';

export const metadata = {
  title: 'Guest account | Forever City Hotel',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const token = (await cookies()).get('hw_guest_session')?.value;
  if (!token) redirect('/sign-in?returnTo=%2Fprofile');
  let guest: { fullName: string; email: string } | null = null;
  let expired = false;
  try {
    const origin = process.env.API_GATEWAY_URL;
    if (!origin) throw new Error('Not configured');
    const response = await fetch(`${origin.replace(/\/$/, '')}/hw/guests/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    expired = response.status === 401;
    if (response.ok) {
      const data: unknown = await response.json();
      if (
        data &&
        typeof data === 'object' &&
        'fullName' in data &&
        typeof data.fullName === 'string' &&
        'email' in data &&
        typeof data.email === 'string'
      )
        guest = { fullName: data.fullName, email: data.email };
    }
  } catch {
    /* Render a retry state without treating an outage as logout. */
  }
  if (expired) redirect('/sign-in?expired=1&returnTo=%2Fprofile');
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.panel}>
        <div>
          <h1>Guest account</h1>
          {guest ? (
            <>
              <h2>Welcome, {guest.fullName}</h2>
              <p>{guest.email}</p>
              <p>
                Your account is ready. Booking management will be available when
                the booking flow is implemented.
              </p>
              <Link href="/rooms">Explore rooms</Link>
            </>
          ) : (
            <p role="alert">
              Your account could not be loaded.{' '}
              <Link href="/profile">Try again</Link>.
            </p>
          )}
          <form action={signOut}>
            <button className="button button-blue">Sign out</button>
          </form>
        </div>
      </main>
    </>
  );
}
