import { ConfigService } from '@nestjs/config';
import { PayHereProvider, payhereMd5, payhereAmount } from './payhere-provider';

describe('PayHere protocol and trust boundaries', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const billing = {
    firstName: 'Test',
    lastName: 'Guest',
    phone: '+94771234567',
    address: 'Test address',
    city: 'Colombo',
    country: 'Sri Lanka',
  };
  let config: Record<string, string>;
  let provider: PayHereProvider;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });
  const token = () =>
    json({ access_token: 'fixture-token', expires_in: 599, scope: 'SANDBOX' });
  const record = () => ({
    payment_id: 12345,
    order_id: id,
    currency: 'LKR',
    amount: 20000,
    status: 'RECEIVED',
  });
  const signed = (changes: Record<string, unknown> = {}) => {
    const body = {
      merchant_id: '123456',
      order_id: id,
      payment_id: '12345',
      payhere_amount: '20000.00',
      payhere_currency: 'LKR',
      status_code: '2',
      ...changes,
    };
    return {
      ...body,
      md5sig: payhereMd5(
        `${String(body.merchant_id)}${String(body.order_id)}${String(body.payhere_amount)}${String(body.payhere_currency)}${String(body.status_code)}${payhereMd5('fixture-secret')}`,
      ),
    };
  };
  beforeEach(() => {
    config = {
      PAYHERE_MODE: 'sandbox',
      PAYHERE_MERCHANT_ID: '123456',
      PAYHERE_MERCHANT_SECRET: 'fixture-secret',
      PAYHERE_APP_ID: 'app',
      PAYHERE_APP_SECRET: 'secret',
      PAYMENT_RETURN_ORIGIN: 'http://localhost:3001',
      PAYHERE_NOTIFY_URL: 'https://hotel.example/hw/payments/payhere/notify',
      NODE_ENV: 'test',
    };
    provider = new PayHereProvider({
      get: (key: string, fallback?: string) => config[key] || fallback,
    } as ConfigService);
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());
  it('uses exact minor-unit amounts and a server-generated PayHere form hash', () => {
    expect(payhereAmount(250001)).toBe('2500.01');
    for (const invalid of [0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1])
      expect(() => payhereAmount(invalid)).toThrow();
    const checkout = provider.checkout(
      id,
      2000000,
      id,
      'guest@example.com',
      billing,
    );
    expect(checkout.action).toBe('https://sandbox.payhere.lk/pay/checkout');
    expect(checkout.fields).toMatchObject({
      order_id: id,
      amount: '20000.00',
      currency: 'LKR',
      first_name: 'Test',
      email: 'guest@example.com',
    });
    expect(checkout.fields.hash).toBe(
      payhereMd5(`123456${id}20000.00LKR${payhereMd5('fixture-secret')}`),
    );
    expect(JSON.stringify(checkout)).not.toContain('fixture-secret');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    { PAYHERE_MODE: '' },
    { PAYHERE_MODE: 'off' },
    { PAYHERE_MERCHANT_ID: '' },
    { PAYHERE_MERCHANT_SECRET: '' },
    { PAYHERE_APP_ID: '' },
    { PAYHERE_APP_SECRET: '' },
    { PAYMENT_RETURN_ORIGIN: 'invalid' },
    { PAYMENT_RETURN_ORIGIN: 'http://evil.example' },
    { PAYMENT_RETURN_ORIGIN: 'https://hotel.example/path' },
    { PAYHERE_NOTIFY_URL: 'https://localhost/hw/payments/payhere/notify' },
    { PAYHERE_NOTIFY_URL: 'http://hotel.example/hw/payments/payhere/notify' },
    { PAYHERE_NOTIFY_URL: 'https://hotel.example/other' },
    {
      PAYHERE_NOTIFY_URL:
        'https://hotel.example/hw/payments/payhere/notify?x=1',
    },
    { PAYHERE_MODE: 'live' },
  ])('rejects incomplete or unsafe checkout configuration %j', (change) => {
    Object.assign(config, change);
    expect(() => provider.settings()).toThrow();
  });
  it('allows live HTTPS only in production', () => {
    Object.assign(config, {
      PAYHERE_MODE: 'live',
      NODE_ENV: 'production',
      PAYMENT_RETURN_ORIGIN: 'https://hotel.example',
    });
    expect(
      provider.checkout(id, 100, id, 'guest@example.com', billing).action,
    ).toBe('https://www.payhere.lk/pay/checkout');
  });
  it('verifies callbacks and ignores unsigned extra/card fields', () => {
    expect(
      provider.verify({ ...signed(), card_no: 'must-not-be-stored' }),
    ).toEqual({
      orderId: id,
      paymentId: '12345',
      amount: '20000.00',
      status: '2',
    });
    expect(() =>
      provider.verify({ ...signed(), md5sig: '0'.repeat(32) }),
    ).toThrow('signature');
  });
  it.each([
    null,
    { merchant_id: 'foreign' },
    { order_id: 'bad' },
    { payment_id: [] },
    { payhere_amount: '20' },
    { payhere_amount: '20000.001' },
    { payhere_currency: 'USD' },
    { status_code: '1' },
  ])('rejects malformed callbacks %j', (change) => {
    expect(() =>
      provider.verify(change === null ? null : signed(change)),
    ).toThrow();
  });
  it('retrieves authoritative receipts and reuses an unexpired token', async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(json({ status: 1, data: [record()] }))
      .mockResolvedValueOnce(json({ status: -1, data: null }));
    expect(await provider.receipts(id)).toEqual([
      { paymentId: '12345', orderId: id, amount: 2000000, status: 'RECEIVED' },
    ]);
    expect(await provider.receipts(id)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${Buffer.from('app:secret').toString('base64')}`,
      },
    });
  });
  it.each([
    null,
    {},
    { access_token: 3 },
    { access_token: 'x', expires_in: 599, scope: 'LIVE' },
  ])('rejects changed authorization responses %j', async (value) => {
    fetchMock.mockResolvedValueOnce(json(value));
    await expect(provider.receipts(id)).rejects.toThrow();
  });
  it.each([
    null,
    {},
    { status: -2, data: null },
    { status: 1, data: {} },
    { status: 1, data: [null] },
    { status: 1, data: [{ ...record(), amount: 1.001 }] },
    { status: 1, data: [{ ...record(), currency: 'USD' }] },
    { status: 1, data: [{ ...record(), order_id: 'other' }] },
    {
      status: 1,
      data: [{ ...record(), payment_id: Number.MAX_SAFE_INTEGER + 1 }],
    },
    { status: 1, data: [{ ...record(), status: 'UNKNOWN' }] },
  ])('fails closed for changed retrieval records %j', async (value) => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json(value));
    await expect(provider.receipts(id)).rejects.toThrow();
  });
  it('fails closed on authentication and retrieval outages', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401));
    await expect(provider.receipts(id)).rejects.toThrow();
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(json({}, 401));
    await expect(provider.receipts(id)).rejects.toThrow();
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(json({ status: -1, data: null }));
    expect(await provider.receipts(id)).toEqual([]);
  });
});
