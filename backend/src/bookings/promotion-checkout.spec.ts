import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import {
  checkoutPromotion,
  lockPromotionHold,
  promotionDiscount,
  redeemPromotion,
  CheckoutPromotion,
} from './promotion-checkout';
import { calculateQuotePricing } from './quote-pricing';

const promotion: CheckoutPromotion = {
  promoId: 'promotion-id',
  code: 'SAVE10',
  discountType: 'PERCENTAGE',
  discountValue: 10,
  version: 2,
  roomTypeIds: ['room-type-id'],
};
describe('Promotion checkout rules', () => {
  it('does not query for absent codes and rejects unknown codes', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const manager = { query } as unknown as EntityManager;
    expect(
      await checkoutPromotion(manager, undefined, 'room-type-id'),
    ).toBeNull();
    expect(query).not.toHaveBeenCalled();
    await expect(
      checkoutPromotion(manager, 'UNKNOWN', 'room-type-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('uses integer half-up percentage rounding and fixed LKR cents before charges', () => {
    expect(promotionDiscount(10005, promotion)).toBe(1001);
    expect(
      promotionDiscount(10005, {
        ...promotion,
        discountType: 'FIXED_AMOUNT',
        discountValue: 500,
      }),
    ).toBe(500);
    const result = calculateQuotePricing(
      10005,
      {
        version: 'fixture',
        rateBasis: 'EXCLUSIVE',
        charges: [
          {
            code: 'SERVICE',
            label: 'Service',
            rateBasisPoints: 1000,
            basis: 'ROOM_SUBTOTAL',
          },
        ],
      },
      1001,
    );
    expect(result).toMatchObject({
      subtotal: 10005,
      discountAmount: 1001,
      additionalCharges: 900,
      totalAmount: 9904,
    });
  });
  it.each([0, -1, 101, 1.5])('rejects invalid percentage %s', (value) => {
    expect(() =>
      promotionDiscount(10000, { ...promotion, discountValue: value }),
    ).toThrow(ConflictException);
  });
  it('rejects complimentary totals rather than violating the existing positive-total schema', () => {
    expect(() =>
      promotionDiscount(10000, { ...promotion, discountValue: 100 }),
    ).toThrow(ConflictException);
    expect(() =>
      promotionDiscount(10000, {
        ...promotion,
        discountType: 'FIXED_AMOUNT',
        discountValue: 20000,
      }),
    ).toThrow(ConflictException);
  });
  it('normalizes codes and counts live holds while the source promotion is locked', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ promoId: promotion.promoId }])
      .mockResolvedValueOnce([{ ...promotion, usable: true, remaining: 2 }])
      .mockResolvedValueOnce([{ count: 1 }]);
    expect(
      await checkoutPromotion(
        { query } as unknown as EntityManager,
        ' save10 ',
        'room-type-id',
      ),
    ).toEqual(promotion);
    const calls = query.mock.calls as unknown as [string, unknown[]][];
    expect(calls[0][1]).toEqual(['SAVE10']);
    expect(calls[0][0]).toContain('FOR UPDATE');
    expect(calls[1][0]).toContain('clock_timestamp()');
    expect(calls[2][0]).toContain('hold_expires_at>clock_timestamp()');
  });
  it.each([
    { ...promotion, usable: false, remaining: 1 },
    { ...promotion, roomTypeIds: ['other'], usable: true, remaining: 1 },
    { ...promotion, usable: true, remaining: 0 },
  ])('rejects unavailable or ineligible promotions', async (row) => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ promoId: promotion.promoId }])
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ count: 0 }]);
    await expect(
      checkoutPromotion(
        { query } as unknown as EntityManager,
        'SAVE10',
        'room-type-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('marks a redemption once and never increments again on callback replay', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ promoId: promotion.promoId }])
      .mockResolvedValue([]);
    const snapshot: Record<string, unknown> = { promotion };
    const manager = { query } as unknown as EntityManager;
    expect(await redeemPromotion(manager, 'booking-id', snapshot)).toBe(true);
    expect(await redeemPromotion(manager, 'booking-id', snapshot)).toBe(true);
    expect(query).toHaveBeenCalledTimes(3);
    expect(snapshot.promotionRedeemed).toBe(true);
  });
  it('refuses exhausted/expired redemption without marking it consumed', async () => {
    const query = jest.fn().mockResolvedValue([]);
    expect(
      await redeemPromotion(
        { query } as unknown as EntityManager,
        'booking-id',
        { promotion },
      ),
    ).toBe(false);
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('does not extend an expired promotion hold after waiting for its lock', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ active: false }]);
    await expect(
      lockPromotionHold({ query } as unknown as EntityManager, 'booking-id', {
        promotion,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
