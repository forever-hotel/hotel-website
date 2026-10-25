import { DataSource, EntityManager } from 'typeorm';
import type Stripe from 'stripe';
import { PaymentRepository } from './payment.repository';
import type { CheckoutPayment } from './payment.repository';

describe('Payment transaction and ownership boundaries', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const now = new Date('2099-01-01T12:00:00Z');
  const payment: CheckoutPayment = {
    paymentId: 'payment',
    option: 'FULL',
    amount: 2000000,
    expiresAt: '2099-01-01T12:35:00Z',
  };
  const row = () => ({
    bookingId: id,
    guestId: 'guest',
    roomTypeId: 'room',
    status: 'PENDING',
    currency: 'LKR',
    totalAmount: 2000000,
    holdExpiresAt: new Date('2099-01-01T12:20:00Z'),
    priceSnapshot: { quoteId: 'quote', nightlyRate: 1000000 },
  });
  const session = () =>
    ({
      id: 'cs_test_fixture',
      livemode: false,
      mode: 'payment',
      status: 'complete',
      payment_status: 'paid',
      currency: 'lkr',
      amount_total: 2000000,
      client_reference_id: id,
      metadata: { bookingId: id, paymentId: 'payment' },
      payment_intent: 'pi_fixture',
      url: null,
    }) as Stripe.Checkout.Session;
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]?]>();
  const direct = jest.fn<Promise<unknown[]>, [string, unknown[]?]>();
  const transaction = jest.fn(
    (_level: string, work: (manager: EntityManager) => Promise<unknown>) =>
      work({ query } as unknown as EntityManager),
  );
  const repository = new PaymentRepository({
    transaction,
    query: direct,
  } as unknown as DataSource);
  function locked(booking: object, status: string | null = 'PENDING') {
    query
      .mockResolvedValueOnce([{ roomTypeId: 'room' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce([{ now }])
      .mockResolvedValueOnce(status ? [{ status }] : []);
  }
  beforeEach(() => {
    jest.clearAllMocks();
    query.mockReset().mockResolvedValue([]);
    direct.mockReset().mockResolvedValue([]);
  });
  it('locks inventory before booking, persists a single attempt and never changes the quoted amount', async () => {
    locked(row());
    const result = await repository.prepare(id, 'guest', 'FULL', null, 35);
    expect(result).toMatchObject({
      amount: 2000000,
      option: 'FULL',
      expiresAt: '2099-01-01T12:35:00.000Z',
    });
    expect(transaction).toHaveBeenCalledWith(
      'READ COMMITTED',
      expect.any(Function),
    );
    expect(query.mock.calls[1][0]).toContain('room_types');
    expect(query.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[2][0]).toContain('FOR UPDATE');
    locked({ ...row(), priceSnapshot: { ...row().priceSnapshot, payment } });
    expect(await repository.prepare(id, 'guest', 'FULL', null, 35)).toEqual(
      payment,
    );
  });
  it('rejects foreign/missing, expired and changed-option checkouts', async () => {
    await expect(
      repository.prepare(id, 'other', 'FULL', null, 35),
    ).rejects.toThrow('Booking not found');
    locked({ ...row(), holdExpiresAt: now });
    await expect(
      repository.prepare(id, 'guest', 'FULL', null, 35),
    ).rejects.toThrow('no longer payable');
    query.mockReset().mockResolvedValue([]);
    locked({ ...row(), priceSnapshot: { payment } });
    await expect(
      repository.prepare(id, 'guest', 'DEPOSIT', 50, 35),
    ).rejects.toThrow('another payment option');
  });
  it('binds attachment to one payment session', async () => {
    locked({ ...row(), priceSnapshot: { payment } });
    await repository.attach(id, 'guest', session());
    query.mockReset().mockResolvedValue([]);
    locked({
      ...row(),
      priceSnapshot: { payment: { ...payment, sessionId: 'other' } },
    });
    await expect(repository.attach(id, 'guest', session())).rejects.toThrow(
      'session changed',
    );
  });
  it('ignores completed replays but produces durable refund work for late/cancelled payments', async () => {
    locked({ ...row(), priceSnapshot: { payment } });
    expect(await repository.settle(session())).toBeNull();
    query.mockReset().mockResolvedValue([]);
    locked(
      { ...row(), status: 'CONFIRMED', priceSnapshot: { payment } },
      'COMPLETED',
    );
    expect(await repository.settle(session())).toBeNull();
    query.mockReset().mockResolvedValue([]);
    locked({ ...row(), holdExpiresAt: now, priceSnapshot: { payment } });
    expect(await repository.settle(session())).toEqual({
      bookingId: id,
      paymentId: 'payment',
      intent: 'pi_fixture',
    });
    query.mockReset().mockResolvedValue([]);
    locked({ ...row(), status: 'CANCELLED', priceSnapshot: { payment } });
    expect(await repository.settle(session())).toMatchObject({
      intent: 'pi_fixture',
    });
  });
  it('does not downgrade a paid record on an older expiry/failure event', async () => {
    locked(
      { ...row(), status: 'CONFIRMED', priceSnapshot: { payment } },
      'COMPLETED',
    );
    await repository.settle(
      { ...session(), status: 'expired', payment_status: 'unpaid' },
      true,
    );
    expect(
      query.mock.calls.some(([sql]) => sql.includes('UPDATE payments')),
    ).toBe(false);
    query.mockReset().mockResolvedValue([]);
    locked({ ...row(), priceSnapshot: { payment } });
    await repository.settle(
      { ...session(), status: 'complete', payment_status: 'unpaid' },
      true,
    );
    expect(
      query.mock.calls.some(([sql]) => sql.includes("payment_status='FAILED'")),
    ).toBe(true);
  });
  it('rejects unbound, mismatched and missing paid references', async () => {
    await expect(
      repository.settle({ ...session(), metadata: {} }),
    ).rejects.toThrow('Unknown payment booking');
    locked({ ...row(), priceSnapshot: { payment } });
    await expect(
      repository.settle({ ...session(), amount_total: 1 }),
    ).rejects.toThrow('does not match');
    query.mockReset().mockResolvedValue([]);
    locked({ ...row(), priceSnapshot: { payment } }, null);
    await expect(repository.settle(session())).rejects.toThrow(
      'Payment not found',
    );
    query.mockReset().mockResolvedValue([]);
    locked({ ...row(), holdExpiresAt: now, priceSnapshot: { payment } });
    await expect(
      repository.settle({ ...session(), payment_intent: null }),
    ).rejects.toThrow('missing its payment intent');
  });
  it('records pending/succeeded refunds idempotently and rejects unrelated refunds', async () => {
    locked({
      ...row(),
      priceSnapshot: { payment: { ...payment, refundRequired: true } },
    });
    await repository.refunded(id, 'payment', false);
    query.mockReset().mockResolvedValue([]);
    locked({
      ...row(),
      priceSnapshot: { payment: { ...payment, refundRequired: true } },
    });
    await repository.refunded(id, 'payment', true);
    query.mockReset().mockResolvedValue([]);
    locked({
      ...row(),
      priceSnapshot: { payment: { ...payment, refundStatus: 'REFUNDED' } },
    });
    await repository.refunded(id, 'payment', true);
    query.mockReset().mockResolvedValue([]);
    locked({ ...row(), priceSnapshot: { payment } });
    await expect(repository.refunded(id, 'other', true)).rejects.toThrow(
      'Unknown refund',
    );
    query.mockReset().mockResolvedValue([]);
    locked({ ...row(), priceSnapshot: { payment } }, 'REFUNDED');
    expect(await repository.settle(session())).toBeNull();
  });
  it('reads owned recovery/status without exposing the hosted payment URL or claiming a cancelled balance is owed', async () => {
    direct.mockResolvedValueOnce([{ bookingId: id }]);
    expect(await repository.recover('guest', 'quote')).toEqual({
      bookingId: id,
    });
    expect(await repository.recover('other', 'quote')).toEqual({
      bookingId: null,
    });
    direct.mockResolvedValueOnce([{ sessionId: 'cs_test_fixture' }]);
    expect(await repository.sessionFor(id, 'guest')).toBe('cs_test_fixture');
    await expect(repository.sessionFor(id, 'other')).rejects.toThrow();
    await expect(repository.status(id, 'other')).rejects.toThrow();
    for (const [status, expired] of [
      ['PENDING', true],
      ['CANCELLED', false],
      ['CONFIRMED', false],
    ] as const) {
      direct.mockResolvedValueOnce([
        {
          ...row(),
          status,
          expired,
          paidAmount: 0,
          priceSnapshot: {
            quoteId: 'quote',
            payment: {
              ...payment,
              checkoutUrl: 'https://checkout.stripe.com/private',
            },
          },
        },
      ]);
      const result = await repository.status(id, 'guest');
      expect(result.priceSnapshot).not.toHaveProperty('payment');
      if (status === 'CANCELLED' || expired)
        expect(result.balanceAmount).toBe(0);
    }
  });
});
