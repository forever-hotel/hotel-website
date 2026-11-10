import Image from 'next/image';
import Link from 'next/link';
import { MainNavigation } from './main-navigation';

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="wordmark header-brand" href="/">
          <Image
            className="header-logo"
            src="/images/branding/forever-city-hotel-logo-v1.png"
            alt="Forever City Hotel"
            width={2172}
            height={724}
            sizes="(max-width: 400px) 156px, (max-width: 760px) 180px, 198px"
            preload
          />
        </Link>
        <MainNavigation />
        <Link href="/profile" className="guest-icon" aria-label="Guest account">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="8" r="3" fill="currentColor" />
            <path d="M5 19v-2a7 5 0 0 1 14 0v2" fill="currentColor" />
          </svg>
        </Link>
        <Link className="button button-gold header-book" href="/#plan-stay">
          Plan your stay
        </Link>
      </header>
    </>
  );
}
