import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validBookingId,
  safeStripeUrl,
  parsePaymentStatus,
  paymentHeading,
  confirmationEmailMessage,
  parsePayHereCheckout,
} from '../src/features/booking/payment.ts';

test('email status distinguishes sandbox, acceptance, failure and unverified delivery', () => {
  assert.match(confirmationEmailMessage('SANDBOX'), /No email was delivered/);
  assert.match(
    confirmationEmailMessage('ACCEPTED'),
    /Inbox delivery is not verified/,
  );
  assert.match(
    confirmationEmailMessage('FAILED'),
    /paid reservation remains valid/,
  );
  for (const state of ['UNKNOWN', 'SENDING'])
    assert.match(confirmationEmailMessage(state), /unverified/);
  assert.match(confirmationEmailMessage(undefined), /No confirmation email/);
});
import {
  paymentRequest,
  readPaymentOptions,
  readPaymentStatus,
  cancelPendingPayment,
} from '../src/features/booking/payments-api.ts';

test('a new selection is allowed only after the previous owned checkout is verified cancelled and unpaid', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ bookingId: id, status: 'CANCELLED', paidAmount: 0 }),
  );
  assert.deepEqual(
    await cancelPendingPayment('https://gateway.invalid', 'session', id),
    {},
  );
  for (const body of [
    { bookingId: id, status: 'CONFIRMED', paidAmount: 9000000 },
    { bookingId: id, status: 'PENDING', paidAmount: 0 },
    { bookingId: id, status: 'CANCELLED', paidAmount: 9000000 },
    { bookingId: 'another-booking', status: 'CANCELLED', paidAmount: 0 },
    {},
  ]) {
    fetchMock.mock.mockImplementation(async () => Response.json(body));
    assert.ok(
      (await cancelPendingPayment('https://gateway.invalid', 'session', id))
        .error,
    );
  }
  fetchMock.mock.mockImplementation(async () =>
    Response.json({}, { status: 503 }),
  );
  assert.ok(
    (await cancelPendingPayment('https://gateway.invalid', 'session', id))
      .error,
  );
  fetchMock.mock.mockImplementation(async () => {
    throw new Error('network unavailable');
  });
  assert.ok(
    (await cancelPendingPayment('https://gateway.invalid', 'session', id))
      .error,
  );
});
const id = '11111111-1111-4111-8111-111111111111';
const payhereForm = {
  action: 'https://sandbox.payhere.lk/pay/checkout',
  fields: {
    merchant_id: '123456',
    order_id: id,
    amount: '20000.00',
    currency: 'LKR',
    hash: 'A'.repeat(32),
    return_url: 'http://localhost:3001/booking/confirmation',
    cancel_url: 'http://localhost:3001/booking/confirmation',
    notify_url: 'https://hotel.example/hw/payments/payhere/notify',
    first_name: 'Test',
    last_name: 'Guest',
    email: 'test@example.com',
    phone: '0771234567',
    address: 'Test street',
    city: 'Colombo',
    country: 'Sri Lanka',
    items: 'Hotel stay',
  },
};
test('PayHere form contracts require all fields and restrict POST destinations', () => {
  assert.deepEqual(parsePayHereCheckout(payhereForm), payhereForm);
  assert.equal(
    parsePayHereCheckout({
      ...payhereForm,
      action: 'https://www.payhere.lk/pay/checkout',
    }).action,
    'https://www.payhere.lk/pay/checkout',
  );
  for (const action of [
    'https://sandbox.payhere.lk.evil.example/pay/checkout',
    'http://www.payhere.lk/pay/checkout',
    'javascript:alert(1)',
    'https://user@www.payhere.lk/pay/checkout',
  ])
    assert.throws(() => parsePayHereCheckout({ ...payhereForm, action }));
  for (const key of Object.keys(payhereForm.fields)) {
    const fields = { ...payhereForm.fields };
    delete fields[key];
    assert.throws(() => parsePayHereCheckout({ ...payhereForm, fields }));
  }
  assert.throws(() =>
    parsePayHereCheckout({
      ...payhereForm,
      fields: { ...payhereForm.fields, submit: 'override' },
    }),
  );
  assert.throws(() =>
    parsePayHereCheckout({
      ...payhereForm,
      fields: { ...payhereForm.fields, hash: 'invalid' },
    }),
  );
  assert.equal(
    paymentHeading({ paymentState: 'REVIEW_REQUIRED' }),
    'Payment requires hotel review',
  );
});
const status = {
  bookingId: id,
  status: 'PENDING',
  roomType: 'Fixture Room',
  checkInDate: '2099-12-10',
  checkOutDate: '2099-12-12',
  numberOfGuests: 2,
  totalAmount: 2000000,
  paidAmount: 0,
  balanceAmount: 2000000,
  currency: 'LKR',
  paymentOption: 'FULL',
  amountDue: 2000000,
  paymentReference: null,
  holdExpiresAt: '2099-12-01T12:35:00Z',
  paymentState: 'PENDING',
  refundStatus: null,
  verificationDelayed: false,
  priceSnapshot: {
    nights: 2,
    nightlyRate: 1000000,
    subtotal: 2000000,
    lineItems: [],
  },
};
test('payment destinations are restricted to Stripe HTTPS and valid booking identities', () => {
  assert.equal(validBookingId(id), true);
  assert.equal(validBookingId('forged'), false);
  assert.equal(
    safeStripeUrl('https://checkout.stripe.com/c/pay/test'),
    'https://checkout.stripe.com/c/pay/test',
  );
  for (const value of [
    null,
    'javascript:alert(1)',
    'http://checkout.stripe.com/test',
    'https://checkout.stripe.com.evil.invalid',
    'https://user@checkout.stripe.com/',
  ])
    assert.equal(safeStripeUrl(value), null);
});
test('confirmation never treats a redirect or unpaid pending status as success', () => {
  assert.deepEqual(parsePaymentStatus(status, id), status);
  assert.equal(paymentHeading(status), 'Payment confirmation pending');
  assert.equal(
    paymentHeading({ ...status, status: 'CONFIRMED', paidAmount: 2000000 }),
    'Your stay is confirmed',
  );
  assert.equal(
    paymentHeading({ ...status, status: 'CONFIRMED', paidAmount: 600000 }),
    'Your stay is confirmed',
  );
  assert.equal(
    paymentHeading({ ...status, status: 'CONFIRMED', paidAmount: 0 }),
    'Payment confirmation pending',
  );
  assert.equal(
    paymentHeading({ ...status, refundStatus: 'PENDING' }),
    'Payment received — refund pending',
  );
  assert.equal(
    paymentHeading({ ...status, refundStatus: 'REFUNDED' }),
    'Payment refunded',
  );
  assert.equal(
    paymentHeading({ ...status, paymentState: 'EXPIRED' }),
    'Checkout cancelled or expired',
  );
  assert.equal(
    paymentHeading({ ...status, status: 'CANCELLED' }),
    'Checkout cancelled or expired',
  );
});
test('authoritative monetary breakdown and cancelled balance are validated', () => {
  const charged = {
    ...status,
    totalAmount: 2200000,
    balanceAmount: 2200000,
    priceSnapshot: {
      ...status.priceSnapshot,
      lineItems: [{ code: 'SERVICE', label: 'Service charge', amount: 200000 }],
    },
  };
  assert.equal(parsePaymentStatus(charged, id).totalAmount, 2200000);
  assert.equal(
    parsePaymentStatus(
      {
        ...status,
        status: 'CONFIRMED',
        paidAmount: 600000,
        balanceAmount: 1400000,
      },
      id,
    ).balanceAmount,
    1400000,
  );
  assert.equal(
    parsePaymentStatus({ ...status, status: 'CANCELLED', balanceAmount: 0 }, id)
      .balanceAmount,
    0,
  );
  for (const changes of [
    { bookingId: 'other' },
    { currency: 'USD' },
    { status: 'SUCCESS_FROM_URL' },
    { numberOfGuests: 0 },
    { paidAmount: -1 },
    { balanceAmount: 1 },
    { priceSnapshot: null },
    { checkOutDate: 'bad' },
    { priceSnapshot: { ...status.priceSnapshot, nights: 0 } },
    { priceSnapshot: { ...status.priceSnapshot, nightlyRate: 1 } },
    {
      priceSnapshot: {
        ...status.priceSnapshot,
        lineItems: [{ code: 'X', label: 'X', amount: -1 }],
      },
    },
    {
      priceSnapshot: { ...status.priceSnapshot, lineItems: [] },
      totalAmount: 1,
      balanceAmount: 1,
    },
  ])
    assert.throws(() => parsePaymentStatus({ ...status, ...changes }, id));
  assert.throws(() => parsePaymentStatus(null, id));
});
test('server payment gateway forwards credentials/key without taking browser prices as authority', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://gateway.invalid/hw/payments/checkout');
      assert.equal(options.headers.Authorization, 'Bearer session');
      assert.equal(options.headers['Idempotency-Key'], 'stable-key');
      assert.equal(options.method, 'POST');
      assert.equal(options.cache, 'no-store');
      return Response.json({ bookingId: id });
    };
    await paymentRequest(
      'https://gateway.invalid/',
      'session',
      '/checkout',
      { quoteToken: 'signed.preview', paymentOption: 'FULL' },
      'stable-key',
    );
    await assert.rejects(() =>
      paymentRequest(undefined, 'session', '/options'),
    );
    globalThis.fetch = async () => Response.json(status);
    assert.equal(
      (await readPaymentStatus('https://gateway.invalid', 'session', id))
        .status,
      'PENDING',
    );
    globalThis.fetch = async () => Response.json({}, { status: 401 });
    await assert.rejects(
      () => readPaymentStatus('https://gateway.invalid', 'session', id),
      /session expired/,
    );
    globalThis.fetch = async () => Response.json({}, { status: 503 });
    await assert.rejects(
      () => readPaymentStatus('https://gateway.invalid', 'session', id),
      /could not be loaded/,
    );
    assert.equal(
      (await readPaymentOptions('https://gateway.invalid', 'session'))
        .available,
      false,
    );
    globalThis.fetch = async () =>
      Response.json({
        available: true,
        depositPercent: null,
        checkoutMinutes: 35,
      });
    assert.deepEqual(
      await readPaymentOptions('https://gateway.invalid', 'session'),
      { available: true, depositPercent: null, checkoutMinutes: 35 },
    );
    globalThis.fetch = async () =>
      Response.json({
        available: true,
        depositPercent: 30,
        checkoutMinutes: 35,
      });
    assert.equal(
      (await readPaymentOptions('https://gateway.invalid', 'session'))
        .depositPercent,
      30,
    );
    globalThis.fetch = async () =>
      Response.json({
        available: true,
        depositPercent: 101,
        checkoutMinutes: 0,
      });
    assert.deepEqual(
      await readPaymentOptions('https://gateway.invalid', 'session'),
      { available: false, depositPercent: null, checkoutMinutes: null },
    );
    globalThis.fetch = async () => Response.json(null);
    assert.equal(
      (await readPaymentOptions('https://gateway.invalid', 'session'))
        .available,
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
