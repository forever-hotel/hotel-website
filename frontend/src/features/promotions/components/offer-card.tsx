import Link from 'next/link';
import { discountLabel } from '../api/promotions';
import type { Promotion } from '../api/promotions';
import { offerRoomsLink } from '../offers';

export function OfferCard({ promotion }: { promotion: Promotion }) {
  return (
    <article className="offer-card">
      <p className="eyebrow">
        {promotion.discountType === 'PERCENTAGE'
          ? 'Percentage discount'
          : 'Fixed discount'}
      </p>
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
      <p>
        Online code application is not available yet. No discount has been
        applied.
      </p>
      <Link className="button button-blue" href={offerRoomsLink(promotion)}>
        Explore eligible room types
      </Link>
    </article>
  );
}
