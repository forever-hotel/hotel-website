import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import Stripe from 'stripe';
import request from 'supertest';
import type { App } from 'supertest/types';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentRepository } from '../database/repositories/payment.repository';
import { JwtTokenService } from '../common/utils/jwt-token.service';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import {
  PaymentsController,
  StripeWebhookController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeProvider } from './stripe-provider';

describe('Stripe checkout HTTP and signature boundary', () => {
  let app: INestApplication<App>;
  const id = '11111111-1111-4111-8111-111111111111';
  const paymentId = '22222222-2222-4222-8222-222222222222';
  const webhookSecret = 'whsec_fixture_only';
  const config = {
    get: (key: string) =>
      ({
        STRIPE_SECRET_KEY: 'sk_test_fixture_only',
        STRIPE_WEBHOOK_SECRET: webhookSecret,
        PAYMENT_RETURN_ORIGIN: 'http://localhost:3001',
      })[key],
  };
  const bookings = { createReservation: jest.fn() };
  const repo = {
    prepare: jest.fn(),
    attach: jest.fn(),
    settle: jest.fn(),
    refunded: jest.fn(),
    status: jest.fn(),
    sessionFor: jest.fn(),
    recover: jest.fn(),
  };
  let provider: StripeProvider;
  const session = () =>
    ({
      id: 'cs_test_fixture',
      mode: 'payment',
      livemode: false,
      metadata: { bookingId: id, paymentId },
      client_reference_id: id,
      currency: 'lkr',
      amount_total: 2000000,
      url: 'https://checkout.stripe.com/c/pay/fixture',
      status: 'open',
      payment_status: 'unpaid',
      payment_intent: 'pi_fixture',
    }) as Stripe.Checkout.Session;
  const post = (path: string) =>
    request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer fixture');
  const signed = (event: object) => {
    const payload = JSON.stringify(event);
    return {
      payload,
      signature: Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
      }),
    };
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController, StripeWebhookController],
      providers: [
        PaymentsService,
        StripeProvider,
        { provide: ConfigService, useValue: config },
        { provide: BookingsService, useValue: bookings },
        { provide: PaymentRepository, useValue: repo },
        {
          provide: JwtTokenService,
          useValue: {
            verify: (value: string) =>
              value === 'fixture' ? { sub: 'guest' } : null,
          },
        },
      ],
    }).compile();
    provider = module.get(StripeProvider);
    app = module.createNestApplication({ rawBody: true });
    app.useLogger(false);
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    bookings.createReservation.mockResolvedValue({ bookingId: id });
    repo.prepare.mockResolvedValue({
      paymentId,
      amount: 2000000,
      option: 'FULL',
      expiresAt: new Date(Date.now() + 2100000).toISOString(),
    });
    repo.settle.mockResolvedValue(null);
    repo.status.mockResolvedValue({ bookingId: id, status: 'PENDING' });
    jest
      .spyOn(provider, 'create')
      .mockResolvedValue(session() as Stripe.Response<Stripe.Checkout.Session>);
    jest
      .spyOn(provider, 'retrieve')
      .mockResolvedValue(session() as Stripe.Response<Stripe.Checkout.Session>);
    jest.spyOn(provider, 'expire').mockResolvedValue({
      ...session(),
      status: 'expired',
    } as Stripe.Response<Stripe.Checkout.Session>);
    jest.spyOn(provider, 'refund').mockResolvedValue({
      status: 'succeeded',
    } as Stripe.Response<Stripe.Refund>);
  });

  it('requires JWT for payment options and owned status', async () => {
    expect(
      (await request(app.getHttpServer()).get('/payments/options')).status,
    ).toBe(401);
    expect(
      (await request(app.getHttpServer()).get(`/payments/${id}`)).status,
    ).toBe(401);
    expect(repo.status).not.toHaveBeenCalled();
  });
  it('uses approved 35-minute hold and disables deposits by default', async () => {
    const response = await request(app.getHttpServer())
      .get('/payments/options')
      .set('Authorization', 'Bearer fixture');
    expect(response.body).toEqual({
      available: true,
      depositPercent: null,
      checkoutMinutes: 35,
    });
  });
  it('starts full payment using authoritative amount and stable payment identity', async () => {
    const response = await post('/payments/checkout')
      .set('Idempotency-Key', 'fixture-key')
      .send({ quoteToken: 'signed.preview', paymentOption: 'FULL' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      bookingId: id,
      checkoutUrl: session().url,
    });
    expect(jest.spyOn(provider, 'create')).toHaveBeenCalledWith(
      id,
      paymentId,
      2000000,
      expect.any(Date),
    );
    expect(bookings.createReservation).toHaveBeenCalledWith(
      'guest',
      { quoteToken: 'signed.preview' },
      'fixture-key',
    );
  });
  it('rejects deposits before creating a hold when no policy is configured', async () => {
    expect(
      (
        await post('/payments/checkout').send({
          quoteToken: 'signed.preview',
          paymentOption: 'DEPOSIT',
        })
      ).status,
    ).toBe(400);
    expect(bookings.createReservation).not.toHaveBeenCalled();
  });
  it.each([
    { totalAmount: 1 },
    { cardNumber: 'test' },
    { paymentOption: 'FREE' },
  ])('rejects unsupported/tampered payment fields %p', async (extra) => {
    expect(
      (
        await post('/payments/checkout').send({
          quoteToken: 'signed.preview',
          paymentOption: 'FULL',
          ...extra,
        })
      ).status,
    ).toBe(400);
  });
  it('returns durable booking identity on uncertain Stripe failure for recovery', async () => {
    jest.spyOn(provider, 'create').mockRejectedValue(new Error('network'));
    const response = await post('/payments/checkout').send({
      quoteToken: 'signed.preview',
      paymentOption: 'FULL',
    });
    expect(response.body).toEqual({
      bookingId: id,
      checkoutUrl: null,
      state: 'RETRY_REQUIRED',
    });
  });
  it('reuses an existing provider session rather than creating another', async () => {
    repo.prepare.mockResolvedValue({
      paymentId,
      amount: 2000000,
      sessionId: session().id,
    });
    await post(`/payments/${id}/resume`)
      .send({ paymentOption: 'FULL' })
      .expect(201);
    expect(jest.spyOn(provider, 'create')).not.toHaveBeenCalled();
    expect(jest.spyOn(provider, 'retrieve')).toHaveBeenCalledWith(session().id);
  });
  it('rejects provider amount mismatch and untrusted redirect URLs', async () => {
    jest.spyOn(provider, 'create').mockResolvedValue({
      ...session(),
      amount_total: 1,
    } as Stripe.Response<Stripe.Checkout.Session>);
    expect(
      (await post(`/payments/${id}/resume`).send({ paymentOption: 'FULL' }))
        .status,
    ).toBe(409);
    jest.spyOn(provider, 'create').mockResolvedValue({
      ...session(),
      url: 'https://evil.invalid',
    } as Stripe.Response<Stripe.Checkout.Session>);
    expect(
      (await post(`/payments/${id}/resume`).send({ paymentOption: 'FULL' }))
        .status,
    ).toBe(409);
  });
  it('rejects unsigned and modified webhook bytes without touching payment state', async () => {
    await request(app.getHttpServer())
      .post('/payments/stripe/webhook')
      .send({ id: 'forged' })
      .expect(400);
    const event = signed({
      id: 'evt_fixture',
      type: 'checkout.session.completed',
      livemode: false,
      data: { object: { id: session().id } },
    });
    await request(app.getHttpServer())
      .post('/payments/stripe/webhook')
      .set('stripe-signature', event.signature)
      .set('Content-Type', 'application/json')
      .send(event.payload.replace('evt_fixture', 'evt_changed'))
      .expect(400);
    expect(repo.settle).not.toHaveBeenCalled();
  });
  it('accepts a correctly signed webhook and retrieves authoritative Stripe state', async () => {
    const event = signed({
      id: 'evt_fixture',
      type: 'checkout.session.completed',
      livemode: false,
      data: { object: { id: session().id, payment_status: 'paid' } },
    });
    await request(app.getHttpServer())
      .post('/payments/stripe/webhook')
      .set('stripe-signature', event.signature)
      .set('Content-Type', 'application/json')
      .send(event.payload)
      .expect(200);
    expect(repo.settle).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: 'unpaid' }),
    );
  });
  it('records refund result for a late payment and retries pending refunds', async () => {
    repo.settle.mockResolvedValue({
      bookingId: id,
      paymentId,
      intent: 'pi_fixture',
    });
    const service = app.get(PaymentsService);
    await service.reconcile(session().id);
    expect(jest.spyOn(provider, 'refund')).toHaveBeenCalledWith(
      'pi_fixture',
      paymentId,
    );
    expect(repo.refunded).toHaveBeenCalledWith(id, paymentId, true);
    jest.spyOn(provider, 'refund').mockResolvedValue({
      status: 'pending',
    } as Stripe.Response<Stripe.Refund>);
    await expect(service.reconcile(session().id)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(repo.refunded).toHaveBeenLastCalledWith(id, paymentId, false);
  });
  it('shows delayed verification honestly and expires unpaid sessions on cancellation', async () => {
    repo.sessionFor.mockResolvedValue(session().id);
    jest
      .spyOn(provider, 'retrieve')
      .mockRejectedValueOnce(new Error('offline'));
    const response = await request(app.getHttpServer())
      .get(`/payments/${id}`)
      .set('Authorization', 'Bearer fixture');
    expect(response.body).toMatchObject({ verificationDelayed: true });
    await post(`/payments/${id}/cancel`).send({}).expect(201);
    expect(jest.spyOn(provider, 'expire')).toHaveBeenCalledWith(session().id);
  });
  it('disables unconfigured checkout before a hold and returns owned recovery references', async () => {
    jest.spyOn(provider, 'settings').mockImplementationOnce(() => {
      throw new ServiceUnavailableException('Not configured');
    });
    expect(app.get(PaymentsService).options()).toMatchObject({
      available: false,
    });
    repo.recover.mockResolvedValue({ bookingId: id });
    const response = await request(app.getHttpServer())
      .get(`/payments/recovery/${id}`)
      .set('Authorization', 'Bearer fixture');
    expect(response.body).toEqual({ bookingId: id });
    expect(repo.recover).toHaveBeenCalledWith('guest', id);
    repo.sessionFor.mockResolvedValue(null);
    await post(`/payments/${id}/cancel`).send({}).expect(409);
    const status = await request(app.getHttpServer())
      .get(`/payments/${id}`)
      .set('Authorization', 'Bearer fixture');
    expect(status.body).toMatchObject({ verificationDelayed: false });
  });
  it('checks already-closed sessions rather than returning a payable URL', async () => {
    const closed = {
      ...session(),
      status: 'complete',
      payment_status: 'paid',
      url: null,
    } as Stripe.Response<Stripe.Checkout.Session>;
    jest.spyOn(provider, 'create').mockResolvedValue(closed);
    const response = await post(`/payments/${id}/resume`).send({
      paymentOption: 'FULL',
    });
    expect(response.body).toEqual({
      bookingId: id,
      checkoutUrl: null,
      state: 'CHECK_STATUS',
    });
  });
  it('checks authoritative status if cancellation races a completed payment', async () => {
    repo.sessionFor.mockResolvedValue(session().id);
    const completed = {
      ...session(),
      status: 'complete',
      payment_status: 'paid',
    } as Stripe.Response<Stripe.Checkout.Session>;
    jest
      .spyOn(provider, 'retrieve')
      .mockResolvedValueOnce(
        session() as Stripe.Response<Stripe.Checkout.Session>,
      )
      .mockResolvedValueOnce(completed);
    jest
      .spyOn(provider, 'expire')
      .mockRejectedValueOnce(new Error('Already completed'));
    repo.status.mockResolvedValue({ bookingId: id, status: 'CONFIRMED' });
    await post(`/payments/${id}/cancel`).send({}).expect(201);
    expect(repo.settle).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: 'paid' }),
    );
  });
  it('ignores unrelated events, rejects live events and handles verified async failures', async () => {
    for (const [type, livemode, expected] of [
      ['customer.created', false, 200],
      ['checkout.session.completed', true, 409],
      ['checkout.session.async_payment_failed', false, 200],
    ] as const) {
      const event = signed({
        id: 'evt_fixture',
        type,
        livemode,
        data: { object: { id: session().id } },
      });
      await request(app.getHttpServer())
        .post('/payments/stripe/webhook')
        .set('stripe-signature', event.signature)
        .set('Content-Type', 'application/json')
        .send(event.payload)
        .expect(expected);
    }
    expect(repo.settle).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: 'unpaid' }),
      true,
    );
  });
});
