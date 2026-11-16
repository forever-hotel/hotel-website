import type { Promotion } from './api/promotions.ts';

export function normalizePromoCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9_-]{1,50}$/.test(code) ? code : null;
}

export type OfferFilter = 'ALL' | 'PERCENTAGE' | 'FIXED';

export function filterOffers(
  promotions: Promotion[],
  filter: OfferFilter,
): Promotion[] {
  return promotions.filter(
    (promotion) => filter === 'ALL' || promotion.discountType === filter,
  );
}

export function offerRoomsLink(promotion: Promotion): string {
  const id = promotion.roomTypeIds.length === 1 ? promotion.roomTypeIds[0] : '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  )
    ? `/rooms?${new URLSearchParams({ roomTypeId: id })}`
    : '/rooms';
}
