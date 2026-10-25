import Link from 'next/link';
import { publicLinks } from './navigation';
import { hotelContact } from '@/features/contact/content';

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/" className="wordmark">
            Forever City Hotel
          </Link>
          <p>
            A sanctuary of luxury and refined hospitality, crafted for those who
            appreciate the finer things in life.
          </p>
        </div>
        <nav aria-label="Explore the hotel">
          <h2>Explore</h2>
          <Link href="/#main-content">Home</Link>
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/#our-hotel">Our story</Link>
        </nav>
        <nav aria-label="Guest information">
          <h2>Guest services</h2>
          <Link href="/#plan-stay">Plan your stay</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/#hotel-policies">Hotel policies</Link>
          <Link href="/profile">Guest account</Link>
          <p>Payment availability is shown during checkout.</p>
        </nav>
        <div>
          <h2>Contact</h2>
          <p>{hotelContact.address}</p>
          <Link href="/contact">Send an enquiry</Link>
          <Link href="/#hotel-policies">Guest information</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} Forever City Hotel. All rights reserved.
        </p>
        <Link href="/#main-content">Back to top ↑</Link>
      </div>
    </footer>
  );
}
