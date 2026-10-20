import { getGatewayJson } from '../../../lib/api/api-client.ts';

export type Promotion = {
  promoId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  currency: 'LKR';
  validFrom: string;
  validUntil: string;
  roomTypeIds: string[];
};

function isPromotion(value: unknown): value is Promotion {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.promoId === 'string' &&
    item.promoId.length > 0 &&
    typeof item.code === 'string' &&
    item.code.length > 0 &&
    (item.discountType === 'PERCENTAGE' || item.discountType === 'FIXED') &&
    typeof item.discountValue === 'number' &&
    Number.isFinite(item.discountValue) &&
    item.discountValue > 0 &&
    (item.discountType === 'PERCENTAGE'
      ? item.discountValue <= 100
      : Number.isInteger(item.discountValue)) &&
    item.currency === 'LKR' &&
    typeof item.validFrom === 'string' &&
    typeof item.validUntil === 'string' &&
    Array.isArray(item.roomTypeIds) &&
    item.roomTypeIds.every((id) => typeof id === 'string')
  );
}

export function activePromotions(data: unknown, now = Date.now()): Promotion[] {
  if (
    !data ||
    typeof data !== 'object' ||
    !('items' in data) ||
    !Array.isArray(data.items)
  )
    return [];
  // The public P1 endpoint supplies published offers only; validity is [from, until).
  return data.items
    .filter(isPromotion)
    .filter(
      (item) =>
        Date.parse(item.validFrom) <= now && now < Date.parse(item.validUntil),
    );
}

export async function getActivePromotions(): Promise<Promotion[]> {
  try {
    return activePromotions(
      await getGatewayJson('/api/v1/promotions?limit=20'),
    );
  } catch {
    // Optional offers must not prevent visitors from viewing hotel content.
    return [];
  }
}

export function discountLabel(promotion: Promotion): string {
  if (promotion.discountType === 'PERCENTAGE')
    return `${promotion.discountValue}% off`;
  return `${new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(promotion.discountValue / 100)} off`;
}
