import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { signOut } from '@/features/auth/actions';
import { guestRequest } from '@/features/bookings/api';
import { BookingCard } from '@/features/bookings/booking-card';
import {
  categories,
  categoryParam,
  pageParam,
  parseBookingList,
} from '@/features/bookings/dashboard';
import type { BookingList, Category } from '@/features/bookings/dashboard';
import styles from '@/features/bookings/dashboard.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'My Bookings | Forever City Hotel',
  robots: { index: false, follow: false },
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category = categoryParam(params.category);
  const page = pageParam(params.page);
  const path = `/profile?category=${category}&page=${page}`;
  const login = `/sign-in?returnTo=${encodeURIComponent(path)}`;
  const token = (await cookies()).get('hw_guest_session')?.value;
  if (!token) redirect(login);
  return (
    <Suspense
      fallback={
        <main
          id="main-content"
          tabIndex={-1}
          className={styles.content}
          aria-busy="true"
        >
          <h1>My Bookings</h1>
          <p role="status">Loading your bookings…</p>
        </main>
      }
    >
      <ProfileDashboard
        token={token}
        category={category}
        page={page}
        path={path}
        login={login}
      />
    </Suspense>
  );
}

async function ProfileDashboard({
  token,
  category,
  page,
  path,
  login,
}: {
  token: string;
  category: Category;
  page: number;
  path: string;
  login: string;
}) {
  // Independent account and booking requests preserve useful content during a partial outage.
  const [accountResponse, bookingResponse] = await Promise.allSettled([
    guestRequest(token, '/guests/me'),
    guestRequest(token, `/bookings?category=${category}&page=${page}`),
  ]);
  if (
    [accountResponse, bookingResponse].some(
      (response) =>
        response.status === 'fulfilled' && response.value.status === 401,
    )
  )
    redirect(`${login}&expired=1`);
  let account: { fullName: string; email: string } | null = null;
  let result: BookingList | null = null;
  try {
    if (accountResponse.status === 'fulfilled' && accountResponse.value.ok) {
      const data: unknown = await accountResponse.value.json();
      if (
        data &&
        typeof data === 'object' &&
        'fullName' in data &&
        typeof data.fullName === 'string' &&
        'email' in data &&
        typeof data.email === 'string'
      )
        account = { fullName: data.fullName, email: data.email };
    }
  } catch {
    /* Keep bookings usable when account details cannot be read. */
  }
  try {
    if (bookingResponse.status === 'fulfilled' && bookingResponse.value.ok)
      result = parseBookingList(
        await bookingResponse.value.json(),
        category,
        page,
      );
  } catch {
    /* Malformed data gets a retry state, never an empty history. */
  }
  const labels = { upcoming: 'Upcoming', past: 'Past', cancelled: 'Cancelled' };
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Guest account">
          <span className={styles.avatar} aria-hidden="true">
            {account
              ? account.fullName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((name) => name[0])
                  .join('')
                  .toUpperCase()
              : 'G'}
          </span>
          {account ? (
            <div>
              <h2>{account.fullName}</h2>
              <p>{account.email}</p>
            </div>
          ) : (
            <p role="alert">
              Your account details could not be loaded.{' '}
              <Link href={path}>Try again</Link>.
            </p>
          )}
          <p>Guest account</p>
          <nav aria-label="Account navigation">
            <Link href="/profile" aria-current="page">
              My Bookings
            </Link>
            <Link href="/rooms">Explore rooms</Link>
          </nav>
          <form action={signOut}>
            <button className="button button-gold">Sign out</button>
          </form>
        </aside>
        <div className={styles.content}>
          <p className="eyebrow">Your stays at Forever</p>
          <h1>My Bookings</h1>
          <p className={styles.intro}>
            Review your reservations and plan your next stay.
          </p>
          {result ? (
            <>
              <div className={styles.summary} aria-label="Booking summary">
                <div className={styles.tile}>
                  <strong>{result.counts.total}</strong>
                  <span>Total bookings</span>
                </div>
                <div className={styles.tile}>
                  <strong>{result.counts.upcoming}</strong>
                  <span>Upcoming stays</span>
                </div>
              </div>
              <nav className={styles.tabs} aria-label="Booking status">
                {categories.map((tab) => (
                  <Link
                    key={tab}
                    href={`/profile?category=${tab}`}
                    aria-current={tab === category ? 'page' : undefined}
                  >
                    {labels[tab]} ({result.counts[tab]})
                  </Link>
                ))}
              </nav>
              {result.items.length ? (
                <div className={styles.list}>
                  {result.items.map((booking) => (
                    <BookingCard key={booking.bookingId} booking={booking} />
                  ))}
                </div>
              ) : (
                <div className={styles.message}>
                  <h2>
                    {result.counts[category] > 0
                      ? 'No bookings on this page'
                      : `No ${category} bookings`}
                  </h2>
                  <p>
                    {result.counts[category] > 0 ? (
                      <Link href={`/profile?category=${category}`}>
                        Return to the first page
                      </Link>
                    ) : (
                      <>
                        When you make a reservation, you can track it here.{' '}
                        <Link href="/rooms">Explore rooms</Link>.
                      </>
                    )}
                  </p>
                </div>
              )}
              {(page > 1 ||
                page * result.pageSize < result.counts[category]) && (
                <nav className={styles.pagination} aria-label="Booking pages">
                  {page > 1 && (
                    <Link
                      href={`/profile?category=${category}&page=${page - 1}`}
                    >
                      Previous
                    </Link>
                  )}
                  <span>Page {page}</span>
                  {page * result.pageSize < result.counts[category] && (
                    <Link
                      href={`/profile?category=${category}&page=${page + 1}`}
                    >
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </>
          ) : (
            <div role="alert" className={styles.message}>
              <h2>Bookings could not be loaded</h2>
              <p>
                Your booking history is temporarily unavailable.{' '}
                <Link href={path}>Try again</Link>.
              </p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
