import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ActiveOffers } from '@/features/promotions/components/active-offers';
import { CookieNotice } from '@/features/home/components/cookie-notice';
import { StayPlanner } from '@/features/home/components/stay-planner';
import { questions, rooms, services } from '@/features/home/content';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="wordmark" href="/">
          The Grand Meridian
        </Link>
        <nav aria-label="Main navigation">
          <a href="#rooms">Rooms</a>
          <a href="#services">Services</a>
          <a href="#offers">Offers</a>
          <a href="#contact">Contact</a>
        </nav>
        <a href="#contact" className="guest-icon" aria-label="Guest services">
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
        </a>
        <a className="button button-gold header-book" href="#plan-stay">
          Book now
        </a>
      </header>
      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <Image
            className="hero-image"
            src="/images/hotel-pool.jpg"
            alt="A resort swimming pool surrounded by tropical greenery"
            fill
            preload
            sizes="100vw"
          />
          <div className="hero-shade" />
          <div className="hero-copy">
            <p className="eyebrow">Welcome to luxury</p>
            <h1 id="hero-title">
              Where <em>Elegance</em>
              <br />
              Meets Comfort
            </h1>
            <p className="hero-description">
              An unforgettable experience awaits. Nestled in the heart of the
              city, discover a sanctuary of refined comfort and timeless
              hospitality.
            </p>
            <div className="hero-actions">
              <a className="button button-champagne" href="#rooms">
                Explore rooms
              </a>
              <a className="button button-outline" href="#offers">
                View offers
              </a>
            </div>
          </div>
          <a className="scroll-cue" href="#our-hotel">
            Scroll to discover<span aria-hidden="true">↓</span>
          </a>
        </section>
        <StayPlanner />
        <section
          className="story section-light"
          id="our-hotel"
          aria-labelledby="story-title"
        >
          <div className="story-inner">
            <div className="story-image">
              <Image
                src="/images/junior-suite.jpg"
                alt="A bright guest room with a neatly made bed and large windows"
                fill
                sizes="(max-width: 760px) 90vw, 38vw"
              />
            </div>
            <div className="story-copy">
              <p className="eyebrow">Our story</p>
              <h2 id="story-title">
                A Legacy of <em>Refined</em>
                <br />
                Hospitality
              </h2>
              <span className="gold-rule" />
              <p>
                Since our founding, The Grand Meridian has set the benchmark for
                luxury hospitality — where timeless elegance meets contemporary
                comfort. Every corner of our hotel tells a story of meticulous
                craftsmanship and heartfelt service.
              </p>
              <p>
                Our team of dedicated professionals ensures that each guest
                enjoys a personalised experience, from the moment of arrival to
                the fond farewell.
              </p>
              <dl className="story-stats">
                <div>
                  <dt>45+</dt>
                  <dd>Years of excellence</dd>
                </div>
                <div>
                  <dt>120</dt>
                  <dd>Luxury rooms & suites</dd>
                </div>
                <div>
                  <dt>98%</dt>
                  <dd>Guest satisfaction</dd>
                </div>
                <div>
                  <dt>15+</dt>
                  <dd>Awards & recognitions</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
        <section
          className="services section-dark"
          id="services"
          aria-labelledby="services-title"
        >
          <div className="section-heading">
            <p className="eyebrow">What we offer</p>
            <h2 id="services-title">
              World-Class <em>Services</em> &<br />
              Facilities
            </h2>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.title}>
                <Image
                  src={`/images/${service.image}`}
                  alt={service.alt}
                  fill
                  sizes="(max-width: 580px) 90vw, (max-width: 900px) 45vw, 25vw"
                />
                <div>
                  <h3>{service.title}</h3>
                  <p className="eyebrow">{service.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
          <a href="#contact" className="button button-outline">
            View all services
          </a>
        </section>
        <section
          className="rooms section-light"
          id="rooms"
          aria-labelledby="rooms-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Accommodations</p>
            <h2 id="rooms-title">
              Our <em>Finest</em> Rooms
            </h2>
            <span className="gold-rule" />
          </div>
          <div className="room-grid">
            {rooms.map((room) => (
              <article className="room-card" key={room.title}>
                <div className="room-image">
                  <Image
                    src={`/images/${room.image}`}
                    alt={`${room.title} interior`}
                    fill
                    sizes="(max-width: 760px) 90vw, 30vw"
                  />
                </div>
                <div className="room-copy">
                  <h3>{room.title}</h3>
                  <p>{room.description}</p>
                  <div className="room-rate">
                    <p>
                      <span>{room.price}</span>
                      <small>per night · sample rate</small>
                    </p>
                    <a
                      className="button button-blue"
                      href="#plan-stay"
                      aria-label={`Plan a stay in the ${room.title}`}
                    >
                      Book now
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <a className="button button-gold" href="#plan-stay">
            View all rooms
          </a>
          <p className="preview-note">
            Illustrative room previews from the design. Live room details and
            rates are not connected yet.
          </p>
        </section>
        <section className="offers" id="offers" aria-labelledby="offers-title">
          <div className="section-heading">
            <p className="eyebrow">Special offers</p>
            <h2 id="offers-title">
              Exclusive <em>Promotions</em>
            </h2>
          </div>
          <Suspense
            fallback={
              <p className="offers-empty" role="status">
                Checking current offers…
              </p>
            }
          >
            <ActiveOffers />
          </Suspense>
        </section>
        <section
          className="testimonial section-light"
          aria-labelledby="testimonial-title"
        >
          <p className="eyebrow" id="testimonial-title">
            Guest experiences
          </p>
          <figure>
            <blockquote>
              “Every detail was flawlessly considered. From the welcome
              champagne to the parting gift, The Grand Meridian redefines what
              luxury hospitality truly means.”
            </blockquote>
            <figcaption>
              — Sarah Mitchell, London <span>· Design sample</span>
            </figcaption>
          </figure>
        </section>
        <section
          className="faq section-dark"
          id="faq"
          aria-labelledby="faq-title"
        >
          <p className="eyebrow">Help centre</p>
          <h2 id="faq-title">
            Frequently Asked <em>Questions</em>
          </h2>
          <span className="gold-rule" />
          <div className="faq-grid">
            {questions.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>
                  {item.question}
                  <span aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer" id="contact">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="wordmark">
              The Grand Meridian
            </Link>
            <p>
              A sanctuary of luxury and refined hospitality, crafted for those
              who appreciate the finer things in life.
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <a href="#main-content">Home</a>
            <a href="#rooms">Rooms & Suites</a>
            <a href="#services">Services</a>
            <a href="#offers">Offers</a>
            <a href="#our-hotel">About Us</a>
          </div>
          <div>
            <h2>Guest services</h2>
            <a href="#plan-stay">Plan your stay</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact Us</a>
            <p>Reservation services coming soon.</p>
          </div>
          <div>
            <h2>Contact</h2>
            <p>Colombo, Sri Lanka</p>
            <p>Contact details will be available soon.</p>
            <a href="#faq">Guest information</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} The Grand Meridian. All rights
            reserved.
          </p>
          <a href="#main-content">Back to top ↑</a>
        </div>
      </footer>
      <CookieNotice />
    </>
  );
}
