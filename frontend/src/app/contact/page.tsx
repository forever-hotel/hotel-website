import Image from 'next/image';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ContactForm } from '@/features/contact/components/contact-form';
import { hotelContact } from '@/features/contact/content';
import styles from '@/features/contact/contact.module.css';

export const metadata: Metadata = {
  title: 'Contact Us | Forever City Hotel',
  description:
    'Find Forever City Hotel in Kiribathgoda and send our team an enquiry about your visit.',
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="contact-title">
          <Image
            src="/images/forever-city-pool.webp"
            alt=""
            fill
            preload
            sizes="100vw"
          />
          <div>
            <p className="eyebrow">We look forward to hearing from you</p>
            <h1 id="contact-title">
              Contact <em>Us</em>
            </h1>
          </div>
        </section>
        <section
          className={styles.contactGrid}
          aria-label="Location and enquiries"
        >
          <div className={styles.location}>
            <iframe
              title="Forever City Hotel location on Google Maps"
              src={hotelContact.embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className={styles.address}>
              <h2>Find us in Kiribathgoda</h2>
              <address>{hotelContact.address}</address>
              <a
                href={hotelContact.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open directions in Google Maps ↗
              </a>
              <p>
                If the map is blocked or slow, use the address above or open
                directions separately.
              </p>
            </div>
          </div>
          <div className={styles.formPanel}>
            <p className="eyebrow">Get in touch</p>
            <h2>
              Send Us a <em>Message</em>
            </h2>
            <span className="gold-rule" />
            <ContactForm />
            <noscript>
              <p>
                JavaScript is needed to submit this form. You can still read our
                address and open directions.
              </p>
            </noscript>
          </div>
        </section>
        <section className={styles.team} aria-labelledby="team-title">
          <p className="eyebrow">A personal welcome</p>
          <h2 id="team-title">
            Meet Our Guest Relations <em>Team</em>
          </h2>
          <p>
            Ask us about your stay, dining or a special occasion. Our guest
            relations team will help with your enquiry.
          </p>
          <p className={styles.teamNote}>
            Team introductions and direct contact details will be added once
            confirmed.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
