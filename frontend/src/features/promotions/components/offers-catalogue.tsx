'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PromotionFeed } from '../api/promotions';
import { filterOffers, normalizePromoCode } from '../offers';
import type { OfferFilter } from '../offers';
import { OfferCard } from './offer-card';
import styles from '../offers.module.css';

export function OffersCatalogue({ feed }: { feed: PromotionFeed }) {
  const [filter, setFilter] = useState<OfferFilter>('ALL');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const offers = filterOffers(feed.promotions, filter);
  return (
    <>
      <section className={styles.codeStrip} aria-labelledby="promo-title">
        <div>
          <h2 id="promo-title">Have a promotion code?</h2>
          <p>
            Choose your dates and room first. Online code application is not
            available yet.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const code = normalizePromoCode(
              String(new FormData(event.currentTarget).get('code') || ''),
            );
            setError(
              code
                ? ''
                : 'Enter 1–50 letters, numbers, hyphens or underscores.',
            );
            setMessage(
              code
                ? `Code ${code} has not been validated or applied. Select your stay and contact the hotel to confirm eligibility.`
                : '',
            );
          }}
        >
          <label htmlFor="promo-code">Promotion code</label>
          <input
            id="promo-code"
            name="code"
            maxLength={50}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby="promo-help"
            onChange={() => {
              setMessage('');
              setError('');
            }}
          />
          <button className="button button-gold">Check next steps</button>
          <p
            id="promo-help"
            role={error ? 'alert' : 'status'}
            className={error ? styles.error : undefined}
          >
            {error || message}
          </p>
        </form>
        <Link href="/rooms">Choose dates and a room</Link>
        <Link href="/contact">Ask about a code</Link>
      </section>
      <section className={styles.catalogue} aria-labelledby="all-offers-title">
        <p className="eyebrow">Plan your next stay</p>
        <h2 id="all-offers-title">All Offers</h2>
        <div
          className={styles.filters}
          role="group"
          aria-label="Filter offers by discount type"
        >
          {(
            [
              ['ALL', 'All offers'],
              ['PERCENTAGE', 'Percentage discounts'],
              ['FIXED', 'Fixed discounts'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className="button button-outline"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {feed.state === 'unavailable' ? (
          <p role="alert">
            Offers are temporarily unavailable.{' '}
            <Link href="/offers">Retry offers</Link> or{' '}
            <Link href="/contact">contact the hotel</Link>.
          </p>
        ) : (
          <>
            <p role="status">
              {offers.length} {offers.length === 1 ? 'offer' : 'offers'} to
              show.
            </p>
            {offers.length ? (
              <div className={styles.grid}>
                {offers.map((promotion) => (
                  <OfferCard key={promotion.promoId} promotion={promotion} />
                ))}
              </div>
            ) : (
              <p>
                No active offers match this filter. Try All offers or check back
                later.
              </p>
            )}
          </>
        )}
        <p>
          Offer eligibility depends on the selected stay and current
          availability. A listed code does not guarantee a discount or reserve a
          room.
        </p>
      </section>
      <section className={styles.newsletter} aria-labelledby="newsletter-title">
        <h2 id="newsletter-title">Stay in touch</h2>
        <p>
          Newsletter subscriptions are not available yet. Contact the hotel for
          current offers.
        </p>
        <Link href="/contact" className="button button-gold">
          Contact the hotel
        </Link>
      </section>
    </>
  );
}
