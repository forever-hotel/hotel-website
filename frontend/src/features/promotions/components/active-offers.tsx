import { discountLabel, getActivePromotions } from '../api/promotions';

export async function ActiveOffers() {
  const promotions = await getActivePromotions();
  if (promotions.length === 0) {
    return (
      <p className="offers-empty">
        There are no offers to show right now. Check back for your next stay.
      </p>
    );
  }
  return (
    <div className="offer-grid">
      {promotions.map((promotion) => (
        <article className="offer-card" key={promotion.promoId}>
          <p className="eyebrow">{discountLabel(promotion)}</p>
          <h3>{discountLabel(promotion)}</h3>
          <p>
            Promotion code: <strong>{promotion.code}</strong>
          </p>
          <p>
            {promotion.roomTypeIds.length
              ? 'Applies to selected room types.'
              : 'Applies to all room types.'}{' '}
            Eligibility is confirmed when booking.
          </p>
          <p>
            Valid until{' '}
            <time dateTime={promotion.validUntil}>
              {new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Colombo',
              }).format(new Date(promotion.validUntil))}
            </time>{' '}
            (Sri Lanka time).
          </p>
        </article>
      ))}
    </div>
  );
}
