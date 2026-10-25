import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activePromotions,
  discountLabel,
  getActivePromotions,
} from '../src/features/promotions/api/promotions.ts';

const now = Date.parse('2026-10-20T12:00:00Z');
const offer = {
  promoId: 'offer-1',
  code: 'STAY10',
  discountType: 'PERCENTAGE',
  discountValue: 10,
  currency: 'LKR',
  roomTypeIds: [],
  validFrom: '2026-10-20T12:00:00Z',
  validUntil: '2026-10-21T12:00:00Z',
};

test('only currently valid offers appear, including start and excluding end', () => {
  const expired = { ...offer, validUntil: new Date(now).toISOString() };
  const future = { ...offer, validFrom: new Date(now + 1).toISOString() };
  assert.deepEqual(activePromotions({ items: [offer, expired, future] }, now), [
    offer,
  ]);
});

test('empty and malformed responses produce an empty list', () => {
  for (const data of [null, undefined, 1, {}, { items: null }, { items: [] }]) {
    assert.deepEqual(activePromotions(data, now), []);
  }
});

test('invalid offers are ignored without discarding valid offers', () => {
  const invalid = [
    null,
    1,
    {},
    { ...offer, promoId: '' },
    { ...offer, code: 3 },
    { ...offer, discountType: 'OTHER' },
    { ...offer, discountValue: 0 },
    { ...offer, discountValue: NaN },
    { ...offer, discountValue: 101 },
    { ...offer, discountType: 'FIXED', discountValue: 1.5 },
    { ...offer, currency: 'USD' },
    { ...offer, validFrom: 1 },
    { ...offer, validUntil: null },
    { ...offer, validFrom: 'invalid' },
    { ...offer, roomTypeIds: null },
    { ...offer, roomTypeIds: [3] },
  ];
  assert.deepEqual(activePromotions({ items: [...invalid, offer] }, now), [
    offer,
  ]);
});

test('discounts use percentage values or LKR minor units', () => {
  assert.equal(discountLabel(offer), '10% off');
  const fixed = { ...offer, discountType: 'FIXED', discountValue: 250000 };
  assert.deepEqual(activePromotions({ items: [fixed] }, now), [fixed]);
  assert.match(discountLabel(fixed), /2,500\.00 off$/);
});

test('gateway integration handles success, HTTP errors, invalid JSON and outages', async () => {
  const originalUrl = process.env.API_GATEWAY_URL;
  const originalFetch = globalThis.fetch;
  try {
    delete process.env.API_GATEWAY_URL;
    globalThis.fetch = () => {
      throw new Error('Must not fetch when unconfigured');
    };
    assert.deepEqual(await getActivePromotions(), []);
    process.env.API_GATEWAY_URL = 'https://gateway.example/';
    const currentOffer = {
      ...offer,
      validFrom: new Date(Date.now() - 60000).toISOString(),
      validUntil: new Date(Date.now() + 60000).toISOString(),
    };
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://gateway.example/hw/promotions?limit=20');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json({ items: [currentOffer] });
    };
    assert.deepEqual(await getActivePromotions(), [currentOffer]);
    globalThis.fetch = async () => new Response(null, { status: 503 });
    assert.deepEqual(await getActivePromotions(), []);
    globalThis.fetch = async () => new Response('invalid JSON');
    assert.deepEqual(await getActivePromotions(), []);
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };
    assert.deepEqual(await getActivePromotions(), []);
    globalThis.fetch = async () => {
      throw new DOMException('Timed out', 'TimeoutError');
    };
    assert.deepEqual(await getActivePromotions(), []);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.API_GATEWAY_URL;
    else process.env.API_GATEWAY_URL = originalUrl;
  }
});
