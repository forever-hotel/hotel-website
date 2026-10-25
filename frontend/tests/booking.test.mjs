import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import {
  bookingUrl,
  hotelToday,
  stayError,
  guestErrors,
  parseQuote,
  money,
  bookingError,
} from '../src/features/booking/booking.ts';
import { fetchQuote } from '../src/features/booking/quote-client.ts';

const stay = {
  roomTypeId: '11111111-1111-4111-8111-111111111111',
  checkInDate: '2099-12-10',
  checkOutDate: '2099-12-12',
  numberOfGuests: 2,
};
const quote = {
  ...stay,
  quoteId: 'preview-1',
  quoteToken: 'signed.preview',
  currency: 'LKR',
  nightlyRate: 2000000,
  nights: 2,
  subtotal: 4000000,
  additionalCharges: 400000,
  totalAmount: 4400000,
  rateBasis: 'EXCLUSIVE',
  lineItems: [{ code: 'SERVICE', label: 'Service charge', amount: 400000 }],
  expiresAt: '2099-12-01T10:10:00Z',
};

test('safe stay navigation roundtrips configuration and excludes quote tokens and guest details', () => {
  for (const step of ['select', 'details', 'guest', 'payment']) {
    const url = new URL(
      bookingUrl({ ...stay, quoteToken: 'secret', email: 'private' }, step),
      'https://hotel.invalid',
    );
    assert.equal(url.searchParams.get('checkInDate'), stay.checkInDate);
    assert.equal(url.searchParams.get('roomTypeId'), stay.roomTypeId);
    assert.equal(url.searchParams.get('numberOfGuests'), '2');
    assert.equal(url.searchParams.get('step'), step);
    assert.equal(url.searchParams.has('quoteToken'), false);
    assert.equal(url.searchParams.has('email'), false);
  }
});

test('hotel dates, stay limits and capacity use Sri Lankan dates', () => {
  assert.equal(hotelToday(new Date('2026-10-22T20:00:00Z')), '2026-10-23');
  assert.equal(stayError(stay, 2, '2099-12-10'), '');
  assert.match(stayError(stay, 1), /up to 1/);
  for (const changes of [
    { checkInDate: '' },
    { checkOutDate: '2099-12-10' },
    { checkOutDate: '2100-12-12' },
    { numberOfGuests: 0 },
    { numberOfGuests: 1.5 },
    { checkInDate: '2099-02-30' },
  ])
    assert.ok(stayError({ ...stay, ...changes }, 4));
  assert.match(stayError(stay, 4, '2100-01-01'), /future/);
});

test('guest review validates account email and only contract-supported requests', () => {
  assert.deepEqual(
    guestErrors('guest@example.com', ' GUEST@example.com ', 'Quiet room.'),
    {},
  );
  assert.ok(guestErrors('guest@example.com', '', '').email);
  assert.ok(guestErrors('guest@example.com', 'other@example.com', '').email);
  assert.ok(guestErrors('', '', '').email);
  assert.ok(guestErrors('a@b.com', 'a@b.com', 'x'.repeat(301)).requests);
  assert.ok(guestErrors('a@b.com', 'a@b.com', '<script>').requests);
  assert.ok(guestErrors('a@b.com', 'a@b.com', '\u0001').requests);
});

test('quote sidebar accepts authoritative cents and rejects inconsistent or foreign data', () => {
  assert.deepEqual(parseQuote(quote, stay), quote);
  assert.equal(
    parseQuote(
      {
        ...quote,
        rateBasis: 'INCLUSIVE',
        additionalCharges: 0,
        totalAmount: 4000000,
        lineItems: [],
      },
      stay,
    ).totalAmount,
    4000000,
  );
  for (const changes of [
    { roomTypeId: 'other' },
    { checkInDate: '2099-12-11' },
    { checkOutDate: '2099-12-13' },
    { numberOfGuests: 3 },
    { totalAmount: 1 },
    { subtotal: -1 },
    { nights: 3 },
    { nightlyRate: 1.5 },
    { currency: 'USD' },
    { quoteToken: '' },
    { quoteId: '' },
    { rateBasis: 'UNKNOWN' },
    { expiresAt: 'bad' },
    { lineItems: null },
    { lineItems: [{ code: 'A', label: 'A', amount: -1 }] },
    { lineItems: [] },
  ])
    assert.throws(() => parseQuote({ ...quote, ...changes }, stay));
  assert.throws(() => parseQuote(null, stay));
  assert.match(money(2000000), /20,000/);
});

test('quote gateway integration forwards only supported fields and never creates a hold', async (t) => {
  const calls = [];
  let status = 201;
  let body = quote;
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    calls.push({
      path: req.url,
      method: req.method,
      auth: req.headers.authorization,
      body: JSON.parse(raw),
    });
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/`;
  assert.deepEqual(
    await fetchQuote(base, 'session', {
      ...stay,
      totalAmount: 1,
      specialRequests: 'not-for-quote',
    }),
    { quote },
  );
  assert.deepEqual(calls[0], {
    path: '/hw/booking-quotes',
    method: 'POST',
    auth: 'Bearer session',
    body: stay,
  });
  for (status of [400, 401, 404, 409, 503]) {
    const result = await fetchQuote(base, 'session', stay);
    assert.equal(result.error, bookingError(status));
    assert.equal(result.signIn, status === 401);
    assert.equal(result.quote, undefined);
  }
  status = 201;
  body = { ...quote, totalAmount: 1 };
  assert.ok((await fetchQuote(base, 'session', stay)).error);
  assert.ok(calls.every((call) => call.path === '/hw/booking-quotes'));
  const count = calls.length;
  assert.equal((await fetchQuote(base, undefined, stay)).signIn, true);
  assert.ok((await fetchQuote(undefined, 'session', stay)).error);
  assert.ok((await fetchQuote('http://127.0.0.1:1', 'session', stay)).error);
  assert.equal(calls.length, count);
});
