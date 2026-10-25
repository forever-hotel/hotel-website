import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createServer } from 'node:http';
import {
  changeInput,
  changeEmailMessage,
  cutoffLabel,
  managementReason,
  parseChangeQuote,
  parseManagement,
  parseMutation,
} from '../src/features/bookings/management.ts';
import {
  previewChange,
  readManagement,
  submitManagement,
} from '../src/features/bookings/management-api.ts';

const id = '11111111-1111-4111-8111-111111111111';
const room = '22222222-2222-4222-8222-222222222222';
const input = {
  roomTypeId: room,
  checkInDate: '2099-12-10',
  checkOutDate: '2099-12-12',
  numberOfGuests: 2,
  specialRequests: 'Quiet room',
};
const state = {
  ...input,
  bookingId: id,
  status: 'CONFIRMED',
  currency: 'LKR',
  totalAmount: 2000000,
  paidAmount: 2000000,
  balanceAmount: 0,
  refundAmount: 0,
  refundStatus: null,
  revision: 0,
  eligible: true,
  cutoff: '2099-12-09T08:30:00Z',
  timeZone: 'Asia/Colombo',
  checkInTime: '14:00',
  modificationSettlement: 'MANUAL_REVIEW',
  cancellationRefund: 'FULL_MANUAL_REVIEW',
};
const quote = {
  ...input,
  bookingId: id,
  quoteId: id,
  quoteToken: 'signed.token',
  currency: 'LKR',
  subtotal: 2000000,
  additionalCharges: 0,
  totalAmount: 2000000,
  nights: 2,
  paidAmount: 2000000,
  balanceAmount: 0,
  refundAmount: 0,
  revision: 0,
  expiresAt: '2099-12-01T12:10:00Z',
  settlementMode: 'MANUAL_REVIEW',
};
const mutation = {
  ...state,
  revision: 1,
  operation: { id, kind: 'MODIFIED', emailStatus: 'SANDBOX' },
  replayed: false,
};

test('eligibility uses server policy and validates money and booking identity', () => {
  assert.equal(parseManagement(state, id).eligible, true);
  for (const change of [
    { bookingId: room },
    { roomTypeId: 'invalid' },
    { checkInDate: '2099-02-30' },
    { currency: 'USD' },
    { eligible: 'true' },
    { paidAmount: -1 },
    { balanceAmount: 10 },
    { timeZone: 'UTC' },
    { checkInTime: '25:00' },
    { cutoff: 'invalid' },
    { cancellationRefund: 'AUTO' },
  ])
    assert.throws(() => parseManagement({ ...state, ...change }, id));
  const ineligible = parseManagement(
    {
      ...state,
      eligible: false,
      reason: { error: 'CHANGE_CUTOFF_PASSED', message: 'internal data' },
    },
    id,
  );
  assert.match(ineligible.reason, /24-hour/);
  assert.doesNotMatch(ineligible.reason, /internal data/);
  assert.equal(
    parseManagement(
      { ...state, eligible: false, currency: null, specialRequests: null },
      id,
    ).specialRequests,
    '',
  );
});
test('change input validates dates/count/requests and excludes client identity and prices', () => {
  assert.deepEqual(
    changeInput({
      ...input,
      specialRequests: ' Quiet room ',
      guestId: 'foreign',
      totalAmount: 1,
    }),
    input,
  );
  for (const change of [
    { roomTypeId: '../foreign' },
    { numberOfGuests: 1.5 },
    { checkOutDate: '2099-12-09' },
    { specialRequests: '<script>' },
    { specialRequests: 'a'.repeat(301) },
  ])
    assert.throws(() => changeInput({ ...input, ...change }));
  assert.throws(() => changeInput(null));
});
test('quote validates selected stay, price differences, expiry and frozen token', () => {
  assert.equal(parseChangeQuote(quote, id, input).totalAmount, 2000000);
  for (const change of [
    { checkOutDate: '2099-12-13' },
    { quoteToken: 'bad' },
    { revision: -1 },
    { expiresAt: 'bad' },
    { subtotal: 1 },
    { balanceAmount: 1 },
    { refundAmount: 1 },
  ])
    assert.throws(() => parseChangeQuote({ ...quote, ...change }, id, input));
  assert.equal(
    parseChangeQuote(
      {
        ...quote,
        subtotal: 3000000,
        totalAmount: 3000000,
        balanceAmount: 1000000,
      },
      id,
      input,
    ).balanceAmount,
    1000000,
  );
  assert.equal(
    parseChangeQuote(
      {
        ...quote,
        subtotal: 1000000,
        totalAmount: 1000000,
        refundAmount: 1000000,
      },
      id,
      input,
    ).refundAmount,
    1000000,
  );
});
test('mutation success requires an operation receipt and never trusts an HTTP success alone', () => {
  assert.equal(parseMutation(mutation, id, 'MODIFIED').operationId, id);
  assert.throws(() =>
    parseMutation({ ...mutation, operation: null }, id, 'MODIFIED'),
  );
  assert.throws(() => parseMutation(mutation, id, 'CANCELLED'));
  assert.throws(() =>
    parseMutation(
      {
        ...mutation,
        operation: { ...mutation.operation, emailStatus: 'DELIVERED' },
      },
      id,
      'MODIFIED',
    ),
  );
  assert.equal(
    parseMutation(
      {
        ...mutation,
        status: 'CANCELLED',
        refundAmount: 2000000,
        refundStatus: 'PENDING',
        operation: { ...mutation.operation, kind: 'CANCELLED' },
      },
      id,
      'CANCELLED',
    ).booking.refundAmount,
    2000000,
  );
});
test('cutoff and email text accurately describe sandbox and acceptance', () => {
  assert.match(cutoffLabel('2099-12-09T08:30:00Z'), /14:00/);
  assert.match(changeEmailMessage('SANDBOX'), /No email was delivered/);
  assert.match(changeEmailMessage('ACCEPTED'), /not verified/);
  assert.match(changeEmailMessage('FAILED'), /saved/);
  assert.match(changeEmailMessage('UNKNOWN'), /not yet verified/);
  assert.match(
    managementReason({ error: 'SETTLEMENT_REVIEW_REQUIRED' }),
    /Staff/,
  );
  assert.doesNotMatch(managementReason({ message: 'secret' }), /secret/);
});
test('gateway integration forwards token, minimal payload and stable request key; uncertain writes remain retryable', async (t) => {
  const calls = [];
  let status = 200;
  let response = state;
  const gateway = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    calls.push({
      path: req.url,
      token: req.headers.authorization,
      key: req.headers['idempotency-key'],
      body: body ? JSON.parse(body) : undefined,
    });
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  });
  gateway.listen(0, '127.0.0.1');
  await once(gateway, 'listening');
  t.after(() => new Promise((resolve) => gateway.close(resolve)));
  const base = `http://127.0.0.1:${gateway.address().port}`;
  assert.equal(
    (await readManagement(base, 'fixture', id)).value.eligible,
    true,
  );
  response = quote;
  assert.ok(
    (
      await previewChange(base, 'fixture', id, {
        ...input,
        guestId: 'foreign',
        totalAmount: 1,
      })
    ).value,
  );
  assert.deepEqual(calls.at(-1).body, input);
  const attempt = {
    kind: 'MODIFIED',
    quoteToken: quote.quoteToken,
    key: 'stable-request-key',
  };
  response = mutation;
  assert.ok((await submitManagement(base, 'fixture', id, attempt)).value);
  assert.deepEqual(calls.at(-1), {
    path: `/hw/bookings/${id}/changes`,
    token: 'Bearer fixture',
    key: attempt.key,
    body: { quoteToken: quote.quoteToken },
  });
  status = 503;
  assert.equal(
    (await submitManagement(base, 'fixture', id, attempt)).kind,
    'uncertain',
  );
  status = 200;
  response = { ...mutation, replayed: true };
  assert.equal(
    (await submitManagement(base, 'fixture', id, attempt)).value.replayed,
    true,
  );
  assert.equal(calls.at(-1).key, attempt.key);
  status = 200;
  response = {};
  assert.equal(
    (await submitManagement(base, 'fixture', id, attempt)).kind,
    'uncertain',
  );
  status = 409;
  response = { error: 'ROOM_UNAVAILABLE' };
  assert.match(
    (await previewChange(base, 'fixture', id, input)).error,
    /no longer available/,
  );
  assert.equal(
    (await submitManagement(base, 'fixture', id, attempt)).kind,
    'conflict',
  );
  status = 401;
  assert.equal((await readManagement(base, 'fixture', id)).kind, 'auth');
  status = 404;
  assert.equal(
    (await submitManagement(base, 'fixture', id, attempt)).kind,
    'invalid',
  );
  status = 400;
  assert.equal(
    (await previewChange(base, 'fixture', id, input)).kind,
    'unavailable',
  );
  assert.equal((await readManagement(base, undefined, id)).kind, 'auth');
  assert.equal((await previewChange(base, undefined, id, input)).kind, 'auth');
  assert.equal(
    (await submitManagement(base, undefined, id, attempt)).kind,
    'auth',
  );
  assert.equal(
    (
      await previewChange(base, 'fixture', id, {
        ...input,
        specialRequests: '<>',
      })
    ).kind,
    'invalid',
  );
  assert.equal(
    (await submitManagement(base, 'fixture', id, { ...attempt, key: 'bad' }))
      .kind,
    'invalid',
  );
  assert.equal(
    (await readManagement(undefined, 'fixture', id)).kind,
    'unavailable',
  );
  assert.equal(
    (await previewChange(undefined, 'fixture', id, input)).kind,
    'unavailable',
  );
  assert.equal(
    (await submitManagement(undefined, 'fixture', id, attempt)).kind,
    'uncertain',
  );
});
