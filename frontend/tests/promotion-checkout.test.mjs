import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bookingUrl, parseQuote } from '../src/features/booking/booking.ts';
import { fetchQuote } from '../src/features/booking/quote-client.ts';
import { parsePaymentStatus } from '../src/features/booking/payment.ts';

const stay = {
  roomTypeId: '11111111-1111-4111-8111-111111111111',
  checkInDate: '2099-12-10',
  checkOutDate: '2099-12-12',
  numberOfGuests: 2,
  promoCode: 'SAVE10',
};
const quote = {
  ...stay,
  quoteId: 'quote',
  quoteToken: 'signed.quote',
  currency: 'LKR',
  nightlyRate: 100000,
  nights: 2,
  subtotal: 200000,
  discountAmount: 20000,
  additionalCharges: 18000,
  totalAmount: 198000,
  rateBasis: 'EXCLUSIVE',
  lineItems: [{ code: 'SERVICE', label: 'Service', amount: 18000 }],
  promotion: { promoId: 'promo-id', code: 'SAVE10' },
  expiresAt: '2099-12-01T10:10:00Z',
};
test('discounted quotes and receipt totals use subtotal minus discount plus charges', () => {
  assert.equal(parseQuote(quote, stay).totalAmount, 198000);
  const bookingId = '22222222-2222-4222-8222-222222222222';
  const receipt = {
    ...stay,
    bookingId,
    status: 'CONFIRMED',
    roomType: 'Fixture',
    currency: 'LKR',
    totalAmount: 198000,
    paidAmount: 198000,
    balanceAmount: 0,
    priceSnapshot: quote,
  };
  assert.equal(parsePaymentStatus(receipt, bookingId).totalAmount, 198000);
  assert.throws(() => parseQuote({ ...quote, totalAmount: 218000 }, stay));
  assert.throws(() => parseQuote({ ...quote, promotion: undefined }, stay));
  assert.throws(() => parseQuote({ ...quote, discountAmount: -1 }, stay));
  assert.throws(() =>
    parseQuote({ ...quote, promotion: { code: 'OTHER' } }, stay),
  );
  assert.throws(() =>
    parsePaymentStatus(
      { ...receipt, totalAmount: 218000, paidAmount: 218000 },
      bookingId,
    ),
  );
});
test('booking navigation retains only the code and safe stay fields', () => {
  const url = new URL(
    bookingUrl({ ...stay, password: 'private', quoteToken: 'private' }),
    'https://hotel.invalid',
  );
  assert.equal(url.searchParams.get('promoCode'), 'SAVE10');
  assert.equal(url.searchParams.has('password'), false);
  assert.equal(url.searchParams.has('quoteToken'), false);
});
test('quote requests send the selected code and surface promotion rejection', async (t) => {
  const calls = [];
  const mocked = t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(JSON.parse(options.body));
    return Response.json(quote, { status: 201 });
  });
  assert.equal(
    (await fetchQuote('https://gateway.invalid', 'guest-token', stay)).quote
      .totalAmount,
    198000,
  );
  assert.deepEqual(calls[0], stay);
  mocked.mock.mockImplementation(async () =>
    Response.json(
      {
        error: 'PROMOTION_EXHAUSTED',
        message: 'This promotion has no uses available.',
      },
      { status: 409 },
    ),
  );
  assert.match(
    (await fetchQuote('https://gateway.invalid', 'guest-token', stay)).error,
    /no uses available/,
  );
});
