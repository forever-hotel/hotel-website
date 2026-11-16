import { BOOKING_POLICY, expiresAt, hotelDate } from './booking-policy';
import { calculateQuotePricing } from './quote-pricing';

describe('Sri Lankan hotel booking policy', () => {
  it('uses the Colombo date across the UTC day boundary', () => {
    expect(hotelDate(new Date('2026-10-22T18:29:00Z'))).toBe('2026-10-22');
    expect(hotelDate(new Date('2026-10-22T18:30:00Z'))).toBe('2026-10-23');
  });
  it('uses absolute expiry times independent of browser timezone', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    expect(
      expiresAt(now, BOOKING_POLICY.quoteLifetimeSeconds).toISOString(),
    ).toBe('2026-10-22T12:10:00.000Z');
    expect(
      expiresAt(now, BOOKING_POLICY.reservationHoldSeconds).toISOString(),
    ).toBe('2026-10-22T12:20:00.000Z');
    expect(() => expiresAt(now, 0)).toThrow();
    expect(() => expiresAt(new Date('invalid'), 600)).toThrow();
  });
  it('calculates only explicitly configured charges using integer cents', () => {
    // Calculation fixture, not a statement of this hotel's applicable tax policy.
    const quote = calculateQuotePricing(1000000, {
      version: 'test-only',
      rateBasis: 'EXCLUSIVE',
      charges: [
        {
          code: 'SERVICE',
          label: 'Service charge',
          rateBasisPoints: 1000,
          basis: 'ROOM_SUBTOTAL',
        },
        {
          code: 'VAT',
          label: 'VAT',
          rateBasisPoints: 1800,
          basis: 'RUNNING_TOTAL',
        },
      ],
    });
    expect(quote.lineItems.map((line) => line.amount)).toEqual([
      100000, 198000,
    ]);
    expect(quote.totalAmount).toBe(1298000);
  });
  it('does not add charges to inclusive room prices', () => {
    expect(
      calculateQuotePricing(1180000, {
        version: 'inclusive-test',
        rateBasis: 'INCLUSIVE',
        charges: [],
      }).totalAmount,
    ).toBe(1180000);
    expect(() =>
      calculateQuotePricing(1180000, {
        version: 'invalid',
        rateBasis: 'INCLUSIVE',
        charges: [
          {
            code: 'VAT',
            label: 'VAT',
            rateBasisPoints: 1800,
            basis: 'ROOM_SUBTOTAL',
          },
        ],
      }),
    ).toThrow();
  });
  it('rounds fractional cents once per charge line', () => {
    const quote = calculateQuotePricing(101, {
      version: 'rounding-test',
      rateBasis: 'EXCLUSIVE',
      charges: [
        {
          code: 'TEST',
          label: 'Test charge',
          rateBasisPoints: 5000,
          basis: 'ROOM_SUBTOTAL',
        },
      ],
    });
    expect(quote.lineItems[0].amount).toBe(51);
    expect(quote.totalAmount).toBe(152);
  });
  it('rejects invalid rates and totals outside the infra integer range', () => {
    for (const rate of [-1, 0.5, 10001])
      expect(() =>
        calculateQuotePricing(100, {
          version: 'test',
          rateBasis: 'EXCLUSIVE',
          charges: [
            {
              code: 'TEST',
              label: 'Test',
              rateBasisPoints: rate,
              basis: 'ROOM_SUBTOTAL',
            },
          ],
        }),
      ).toThrow();
    expect(() =>
      calculateQuotePricing(2147483647, {
        version: 'overflow',
        rateBasis: 'EXCLUSIVE',
        charges: [
          {
            code: 'TEST',
            label: 'Test',
            rateBasisPoints: 10000,
            basis: 'ROOM_SUBTOTAL',
          },
        ],
      }),
    ).toThrow();
  });
});
