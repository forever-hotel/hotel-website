import Link from 'next/link';
import { publicLinks } from './navigation';

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="wordmark" href="/">
          Forever City Hotel
        </Link>
        <nav aria-label="Main navigation">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/contact"
          className="guest-icon"
          aria-label="Guest services"
        >
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
