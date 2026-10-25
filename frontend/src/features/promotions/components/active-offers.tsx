import Link from 'next/link';
import { getPromotionFeed } from '../api/promotions';
import { OfferCard } from './offer-card';

export async function ActiveOffers() {
  const { promotions, state } = await getPromotionFeed();
  if (promotions.length === 0) {
    return (
      <p className="offers-empty">
        There are no offers to show right now. Check back for your next stay.
        {state === 'unavailable' && ' Offers could not be loaded.'}{' '}
        <Link href="/offers">View offers and retry</Link>.
      </p>
    );
  }
  return (
    <div className="offer-grid">
      {promotions.map((promotion) => (
        <OfferCard key={promotion.promoId} promotion={promotion} />
      ))}
    </div>
  );
}
