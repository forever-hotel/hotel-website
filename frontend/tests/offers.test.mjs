import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizePromoCode,
  filterOffers,
  offerRoomsLink,
} from '../src/features/promotions/offers.ts';
import {
  activePromotions,
  getPromotionFeed,
} from '../src/features/promotions/api/promotions.ts';

const offer = {
  promoId: 'p1',
  code: 'STAY10',
  discountType: 'PERCENTAGE',
  discountValue: 10,
  currency: 'LKR',
  validFrom: '2026-01-01T00:00:00Z',
  validUntil: '2099-01-01T00:00:00Z',
  roomTypeIds: [],
};

test('code syntax normalizes without claiming eligibility or calculating a discount', () => {
  assert.equal(normalizePromoCode(' stay_10-a '), 'STAY_10-A');
  for (const value of ['', ' ', 'A'.repeat(51), 'invalid code', '<b>', 'é'])
    assert.equal(normalizePromoCode(value), null);
});

test('supported filters use discount types without invented categories or featured flags', () => {
  const fixed = {
    ...offer,
    promoId: 'p2',
    code: 'SAVE500',
    discountType: 'FIXED',
    discountValue: 50000,
  };
  assert.deepEqual(filterOffers([offer, fixed], 'ALL'), [offer, fixed]);
  assert.deepEqual(filterOffers([offer, fixed], 'PERCENTAGE'), [offer]);
  assert.deepEqual(filterOffers([offer, fixed], 'FIXED'), [fixed]);
  assert.deepEqual(filterOffers([], 'ALL'), []);
});

test('room guidance carries only a supported single room identity, never a validated code', () => {
  const uuid = '11111111-1111-4111-8111-111111111111';
  assert.equal(offerRoomsLink(offer), '/rooms');
  assert.equal(
    offerRoomsLink({ ...offer, roomTypeIds: [uuid] }),
    `/rooms?roomTypeId=${uuid}`,
  );
  assert.equal(
    offerRoomsLink({ ...offer, roomTypeIds: [uuid, uuid] }),
    '/rooms',
  );
  assert.equal(
    offerRoomsLink({ ...offer, roomTypeIds: ['javascript:bad'] }),
    '/rooms',
  );
});

test('unagreed marketing fields are not exposed as approved offer content', () => {
  assert.deepEqual(
    activePromotions({
      items: [
        {
          ...offer,
          title: 'Unapproved headline',
          featured: true,
          imageUrl: 'https://unapproved.invalid/photo.jpg',
          category: 'Honeymoon',
        },
      ],
    }),
    [offer],
  );
  for (const code of ['with spaces', '<script>', 'A'.repeat(51)])
    assert.deepEqual(activePromotions({ items: [{ ...offer, code }] }), []);
});

test('public feed distinguishes valid empty lists from missing config, malformed data and upstream failures', async () => {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.API_GATEWAY_URL;
  try {
    delete process.env.API_GATEWAY_URL;
    assert.deepEqual(await getPromotionFeed(), {
      state: 'unavailable',
      promotions: [],
    });
    process.env.API_GATEWAY_URL = 'https://fixture.invalid';
    for (const body of [{ items: [] }, { items: [offer] }]) {
      globalThis.fetch = async () => Response.json(body);
      assert.equal((await getPromotionFeed()).state, 'ready');
    }
    for (const body of [null, {}, { items: null }, { items: [{}] }]) {
      globalThis.fetch = async () => Response.json(body);
      assert.deepEqual(await getPromotionFeed(), {
        state: 'unavailable',
        promotions: [],
      });
    }
    globalThis.fetch = async () => Response.json({}, { status: 503 });
    assert.equal((await getPromotionFeed()).state, 'unavailable');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBase === undefined) delete process.env.API_GATEWAY_URL;
    else process.env.API_GATEWAY_URL = originalBase;
  }
});
