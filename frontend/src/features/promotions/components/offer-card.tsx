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
        Contact the hotel to confirm availability and arrange this offer.
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
        This offer is arranged directly with the hotel. Standard online room
        bookings use the total shown at checkout.
      </p>
      <Link
        className="button button-blue"
        href={`/contact?offer=${encodeURIComponent(promotion.code)}`}
      >
        Enquire about this offer
      </Link>
      <Link href={offerRoomsLink(promotion)}>Explore eligible room types</Link>
    </article>
  );
}
