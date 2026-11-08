import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

export interface CheckoutPromotion {
  promoId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  version: number;
  roomTypeIds: string[];
}

export function promotionDiscount(
  subtotal: number,
  promotion: CheckoutPromotion,
): number {
  const value = promotion.discountValue;
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    !['PERCENTAGE', 'FIXED_AMOUNT'].includes(promotion.discountType) ||
    (promotion.discountType === 'PERCENTAGE' && value > 100)
  )
    throw new ConflictException({
      error: 'PROMOTION_UNAVAILABLE',
      message: 'This promotion is not configured correctly.',
    });
  const discount =
    promotion.discountType === 'PERCENTAGE'
      ? Number((BigInt(subtotal) * BigInt(value) + 50n) / 100n)
      : value;
  if (discount >= subtotal)
    throw new ConflictException({
      error: 'PROMOTION_NOT_PAYABLE',
      message:
        'This promotion covers the entire room charge. Contact the hotel to arrange a complimentary booking.',
    });
  return discount;
}

/** All checkout callers lock room inventory first, then the promotion row. */
export async function checkoutPromotion(
  manager: EntityManager,
  code: string | undefined,
  roomTypeId: string,
): Promise<CheckoutPromotion | null> {
  if (!code?.trim()) return null;
  const locked = await manager.query<{ promoId: string }[]>(
    'SELECT promo_id AS "promoId" FROM mad_promotion_codes WHERE upper(btrim(code_string))=$1 FOR UPDATE',
    [code.trim().toUpperCase()],
  );
  if (locked.length !== 1)
    throw new ConflictException({
      error: 'PROMOTION_UNAVAILABLE',
      message: 'This promotion is invalid or unavailable.',
    });
  // Evaluate the clock in a fresh statement after any lock wait.
  const rows = await manager.query<
    (CheckoutPromotion & { usable: boolean; remaining: number })[]
  >(
    `SELECT p.promo_id AS "promoId",upper(btrim(p.code_string)) AS code,
      p.discount_type AS "discountType",p.discount_value AS "discountValue",COALESCE((to_jsonb(p)->>'version')::int,0) AS version,
      ARRAY(SELECT r.room_type_id::text FROM mad_promotion_room_types r WHERE r.promo_id=p.promo_id ORDER BY r.room_type_id) AS "roomTypeIds",
      ((to_jsonb(p)->>'deleted_at') IS NULL AND p.status='ACTIVE' AND p.valid_from<=clock_timestamp() AND clock_timestamp()<p.valid_until) AS usable,
      p.max_redemptions-p.current_redemptions AS remaining
     FROM mad_promotion_codes p WHERE p.promo_id=$1`,
    [locked[0].promoId],
  );
  const promotion = rows[0];
  if (
    rows.length !== 1 ||
    !promotion ||
    !promotion.usable ||
    (promotion.roomTypeIds.length &&
      !promotion.roomTypeIds.includes(roomTypeId))
  )
    throw new ConflictException({
      error: 'PROMOTION_UNAVAILABLE',
      message:
        'This promotion is invalid, inactive, expired or unavailable for this room.',
    });
  const holds = await manager.query<{ count: number }[]>(
    `SELECT count(*)::int AS count FROM bookings WHERE promo_id=$1 AND status='PENDING'
       AND checkout_key IS NOT NULL AND hold_expires_at>clock_timestamp()`,
    [promotion.promoId],
  );
  if (promotion.remaining <= holds[0].count)
    throw new ConflictException({
      error: 'PROMOTION_EXHAUSTED',
      message:
        'This promotion has no uses available. Remove it or try another code.',
    });
  return {
    promoId: promotion.promoId,
    code: promotion.code,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    version: promotion.version,
    roomTypeIds: promotion.roomTypeIds,
  };
}

/** Caller holds the booking lock. A paid booking consumes its promotion only once. */
export async function redeemPromotion(
  manager: EntityManager,
  bookingId: string,
  pricing: Record<string, unknown>,
): Promise<boolean> {
  const promotion = pricing.promotion as CheckoutPromotion | undefined;
  if (!promotion || pricing.promotionRedeemed === true) return true;
  await manager.query(
    'SELECT promo_id FROM mad_promotion_codes WHERE promo_id=$1 FOR UPDATE',
    [promotion.promoId],
  );
  const rows = await manager.query<{ promoId: string }[]>(
    `UPDATE mad_promotion_codes SET current_redemptions=current_redemptions+1,updated_at=clock_timestamp()
     WHERE promo_id=$1 AND current_redemptions<max_redemptions
       AND EXISTS(SELECT 1 FROM bookings WHERE booking_id=$2 AND status='PENDING' AND hold_expires_at>clock_timestamp())
     RETURNING promo_id AS "promoId"`,
    [promotion.promoId, bookingId],
  );
  if (!rows.length) return false;
  await manager.query(
    `UPDATE bookings SET price_snapshot=jsonb_set(price_snapshot,'{promotionRedeemed}','true'::jsonb) WHERE booking_id=$1`,
    [bookingId],
  );
  pricing.promotionRedeemed = true;
  return true;
}

/** Serialize hold extension against new reservations before rechecking the clock. */
export async function lockPromotionHold(
  manager: EntityManager,
  bookingId: string,
  pricing: Record<string, unknown>,
): Promise<void> {
  const promotion = pricing.promotion as CheckoutPromotion | undefined;
  if (!promotion) return;
  await manager.query(
    'SELECT promo_id FROM mad_promotion_codes WHERE promo_id=$1 FOR UPDATE',
    [promotion.promoId],
  );
  const rows = await manager.query<{ active: boolean }[]>(
    `SELECT status='PENDING' AND hold_expires_at>clock_timestamp() AS active FROM bookings WHERE booking_id=$1`,
    [bookingId],
  );
  if (!rows[0]?.active)
    throw new ConflictException(
      'This promotional checkout expired. Request a fresh quote.',
    );
}
