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
        Apply this code to your booking to check eligibility and the current
        discounted price.
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
        Discount eligibility and remaining uses are checked at checkout. Your
        confirmed quote shows the amount to pay.
      </p>
      <Link
        className="button button-blue"
        href={`/booking?${new URLSearchParams({ promoCode: promotion.code, step: 'select', ...(promotion.roomTypeIds.length === 1 ? { roomTypeId: promotion.roomTypeIds[0] } : {}) })}`}
      >
        Book with this code
      </Link>
      <Link href={offerRoomsLink(promotion)}>Explore eligible room types</Link>
    </article>
  );
}
