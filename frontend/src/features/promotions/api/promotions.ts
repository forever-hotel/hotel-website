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
    /^[A-Za-z0-9_-]{1,50}$/.test(item.code) &&
    (item.discountType === 'PERCENTAGE' || item.discountType === 'FIXED') &&
    typeof item.discountValue === 'number' &&
    Number.isFinite(item.discountValue) &&
    item.discountValue > 0 &&
    (item.discountType === 'PERCENTAGE'
      ? item.discountValue <= 100
      : Number.isSafeInteger(item.discountValue)) &&
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
  // The backend supplies active, non-exhausted codes; validity is [from, until).
  return data.items
    .filter(isPromotion)
    .filter(
      (item) =>
        Date.parse(item.validFrom) <= now && now < Date.parse(item.validUntil),
    )
    .map(
      ({
        promoId,
        code,
        discountType,
        discountValue,
        currency,
        validFrom,
        validUntil,
        roomTypeIds,
      }) => ({
        promoId,
        code,
        discountType,
        discountValue,
        currency,
        validFrom,
        validUntil,
        roomTypeIds,
      }),
    );
}

export async function getActivePromotions(): Promise<Promotion[]> {
  return (await getPromotionFeed()).promotions;
}

export type PromotionFeed = {
  state: 'ready' | 'unavailable';
  promotions: Promotion[];
};

export async function getPromotionFeed(): Promise<PromotionFeed> {
  try {
    const data = await getGatewayJson('/hw/promotions?limit=20');
    if (
      !data ||
      typeof data !== 'object' ||
      !('items' in data) ||
      !Array.isArray(data.items) ||
      (data.items.length > 0 && !data.items.some(isPromotion))
    )
      throw new Error('Invalid public promotion feed');
    return { state: 'ready', promotions: activePromotions(data) };
  } catch {
    return { state: 'unavailable', promotions: [] };
  }
}

export function discountLabel(promotion: Promotion): string {
  if (promotion.discountType === 'PERCENTAGE')
    return `${promotion.discountValue}% off`;
  return `${new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(promotion.discountValue / 100)} off`;
}
