import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeProvider } from './stripe-provider';

describe('Stripe provider policy and idempotency', () => {
  const values: Record<string, string> = {
    STRIPE_SECRET_KEY: 'sk_test_fixture',
    STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
    PAYMENT_RETURN_ORIGIN: 'http://localhost:3001',
  };
  const make = (changes: Record<string, string> = {}) =>
    new StripeProvider({
      get: (key: string) => ({ ...values, ...changes })[key],
    } as ConfigService);
  it('allows only configured test credentials, safe return origins and supported hold durations', () => {
    expect(make().settings()).toMatchObject({
      minutes: 35,
      depositPercent: null,
    });
    for (const changes of [
      { STRIPE_SECRET_KEY: 'sk_live_wrong' },
      { STRIPE_WEBHOOK_SECRET: '' },
      { PAYMENT_RETURN_ORIGIN: 'http://evil.invalid' },
      { PAYMENT_RETURN_ORIGIN: 'https://hotel.invalid/redirect' },
      { PAYMENT_RETURN_ORIGIN: 'bad' },
      { STRIPE_CHECKOUT_MINUTES: '20' },
      { STRIPE_CHECKOUT_MINUTES: '121' },
      { NODE_ENV: 'production' },
    ])
      expect(() => make(changes).settings()).toThrow();
    expect(
      make({
        PAYMENT_RETURN_ORIGIN: 'https://hotel.invalid',
        PAYMENT_DEPOSIT_PERCENT: '30',
      }).settings().depositPercent,
    ).toBe(30);
  });
  it('uses one Checkout idempotency key and an unchanged server price, with card-only hosted collection', async () => {
    const provider = make();
    const sdk = new Stripe('sk_test_fixture');
    jest
      .spyOn(provider as unknown as { client: () => Stripe }, 'client')
      .mockReturnValue(sdk);
    const create = jest
      .spyOn(sdk.checkout.sessions, 'create')
      .mockResolvedValue({
        id: 'cs_test_fixture',
      } as Stripe.Response<Stripe.Checkout.Session>);
    const expires = new Date('2099-01-01T12:00:00Z');
    await provider.create('booking', 'payment', 2000000, expires);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        allowed_payment_method_types: ['card'],
        expires_at: Math.floor(expires.getTime() / 1000),
        metadata: { bookingId: 'booking', paymentId: 'payment' },
        success_url:
          'http://localhost:3001/booking/confirmation?bookingId=booking',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'lkr',
              unit_amount: 2000000,
              product_data: { name: 'Forever City Hotel reservation payment' },
            },
          },
        ],
      }),
      { idempotencyKey: 'hw-checkout-payment' },
    );
    const refund = jest.spyOn(sdk.refunds, 'create').mockResolvedValue({
      id: 're_fixture',
    } as Stripe.Response<Stripe.Refund>);
    const current = jest.spyOn(sdk.refunds, 'retrieve').mockResolvedValue({
      id: 're_fixture',
      status: 'succeeded',
    } as Stripe.Response<Stripe.Refund>);
    await provider.refund('pi_fixture', 'payment');
    expect(refund).toHaveBeenCalledWith(
      { payment_intent: 'pi_fixture', metadata: { paymentId: 'payment' } },
      { idempotencyKey: 'hw-expired-refund-payment' },
    );
    expect(current).toHaveBeenCalledWith('re_fixture');
    const retrieve = jest
      .spyOn(sdk.checkout.sessions, 'retrieve')
      .mockResolvedValue({
        id: 'cs_test_fixture',
      } as Stripe.Response<Stripe.Checkout.Session>);
    const expire = jest
      .spyOn(sdk.checkout.sessions, 'expire')
      .mockResolvedValue({
        id: 'cs_test_fixture',
        status: 'expired',
      } as Stripe.Response<Stripe.Checkout.Session>);
    await provider.retrieve('cs_test_fixture');
    await provider.expire('cs_test_fixture');
    expect(retrieve).toHaveBeenCalledWith('cs_test_fixture');
    expect(expire).toHaveBeenCalledWith('cs_test_fixture');
    jest.restoreAllMocks();
  });
});
