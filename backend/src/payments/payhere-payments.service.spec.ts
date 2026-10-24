import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import request from 'supertest';
import { JwtTokenService } from '../common/utils/jwt-token.service';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import { BookingsService } from '../bookings/bookings.service';
import { ConfirmationEmailService } from './confirmation-email.service';
import { PayHereProvider } from './payhere-provider';
import { PayHereRepository } from './payhere.repository';
import { PayHerePaymentsService } from './payhere-payments.service';
import {
  PayHerePaymentsController,
  PayHereNotifyController,
} from './payhere.controller';

describe('PayHere checkout HTTP boundary and reconciliation', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const orderId = '22222222-2222-4222-8222-222222222222';
  const billing = {
    firstName: 'Test',
    lastName: 'Guest',
    phone: '+94771234567',
    address: 'Test street',
    city: 'Colombo',
    country: 'Sri Lanka',
  };
  const bookings = { createReservation: jest.fn() };
  const repo = {
    supported: jest.fn(),
    recover: jest.fn(),
    prepareCheckout: jest.fn(),
    status: jest.fn(),
    metadata: jest.fn(),
    locate: jest.fn(),
    settleReceipts: jest.fn(),
    cancelCheckout: jest.fn(),
  };
  const provider = {
    settings: jest.fn(),
    checkout: jest.fn(),
    receipts: jest.fn(),
    verify: jest.fn(),
  };
  const email = { send: jest.fn() };
  let service: PayHerePaymentsService;
  let app: INestApplication<App>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PayHerePaymentsController, PayHereNotifyController],
      providers: [
        PayHerePaymentsService,
        { provide: BookingsService, useValue: bookings },
        { provide: PayHereRepository, useValue: repo },
        { provide: PayHereProvider, useValue: provider },
        { provide: ConfirmationEmailService, useValue: email },
        {
          provide: JwtTokenService,
          useValue: {
            verify: (token: string) =>
              token === 'fixture' ? { sub: 'guest' } : null,
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    service = module.get(PayHerePaymentsService);
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    bookings.createReservation.mockResolvedValue({ bookingId: id });
    repo.supported.mockResolvedValue(true);
    repo.prepareCheckout.mockResolvedValue({
      provider: 'PAYHERE',
      environment: 'sandbox',
      paymentId: orderId,
      amount: 2000000,
      billing,
    });
    repo.status.mockResolvedValue({
      bookingId: id,
      status: 'PENDING',
      guestEmail: 'guest@example.com',
      paymentState: 'PENDING',
    });
    repo.metadata.mockResolvedValue({
      provider: 'PAYHERE',
      environment: 'sandbox',
      paymentId: orderId,
    });
    repo.locate.mockResolvedValue({ bookingId: id, environment: 'sandbox' });
    repo.settleReceipts.mockResolvedValue({
      reviewRequired: false,
      paid: true,
    });
    provider.settings.mockReturnValue({ mode: 'sandbox', minutes: 35 });
    provider.checkout.mockReturnValue({
      action: 'https://sandbox.payhere.lk/pay/checkout',
      fields: {},
    });
    provider.receipts.mockResolvedValue([
      { orderId, paymentId: '12345', amount: 2000000, status: 'RECEIVED' },
    ]);
    provider.verify.mockReturnValue({
      orderId,
      paymentId: '12345',
      amount: '20000.00',
      status: '2',
    });
    email.send.mockResolvedValue(undefined);
  });
  const post = (path: string) =>
    request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer fixture');
  it('protects checkout/status and validates required billing before creating a reservation', async () => {
    await request(app.getHttpServer()).get(`/payments/${id}`).expect(401);
    await post('/payments/checkout')
      .send({ quoteToken: 'signed.preview', paymentOption: 'FULL' })
      .expect(400);
    await post('/payments/checkout')
      .send({
        quoteToken: 'signed.preview',
        paymentOption: 'FULL',
        billing: { ...billing, firstName: ' ', phone: 'bad', price: 1 },
      })
      .expect(400);
    expect(bookings.createReservation).not.toHaveBeenCalled();
  });
  it('returns a server-priced form and forwards billing, guest identity and idempotency', async () => {
    const result = await post('/payments/checkout')
      .set('Idempotency-Key', 'fixture-key')
      .send({
        quoteToken: 'signed.preview',
        specialRequests: '',
        paymentOption: 'FULL',
        billing,
      })
      .expect(201);
    expect(result.body).toMatchObject({
      bookingId: id,
      state: 'READY',
      checkout: { action: 'https://sandbox.payhere.lk/pay/checkout' },
    });
    expect(bookings.createReservation).toHaveBeenCalledWith(
      'guest',
      { quoteToken: 'signed.preview', specialRequests: '' },
      'fixture-key',
    );
    expect(provider.checkout).toHaveBeenCalledWith(
      orderId,
      2000000,
      id,
      'guest@example.com',
      billing,
    );
    expect(email.send).not.toHaveBeenCalled();
  });
  it('rejects deposits and missing migration without taking a hold', async () => {
    await post('/payments/checkout')
      .send({ quoteToken: 'signed.preview', paymentOption: 'DEPOSIT', billing })
      .expect(400);
    repo.supported.mockResolvedValue(false);
    await post('/payments/checkout')
      .send({ quoteToken: 'signed.preview', paymentOption: 'FULL', billing })
      .expect(503);
    expect(bookings.createReservation).not.toHaveBeenCalled();
  });
  it('reports availability and fails closed on configuration failure', async () => {
    expect(await service.options()).toMatchObject({
      available: true,
      sandbox: true,
      depositPercent: null,
    });
    provider.settings.mockImplementation(() => {
      throw new Error('not configured');
    });
    expect(await service.options()).toMatchObject({ available: false });
  });
  it('resumes the existing order only after authoritative reconciliation', async () => {
    await post(`/payments/${id}/resume`)
      .send({ paymentOption: 'FULL' })
      .expect(201);
    expect(provider.receipts).toHaveBeenCalledWith(orderId);
    expect(repo.prepareCheckout).toHaveBeenCalledWith(
      id,
      'guest',
      'sandbox',
      undefined,
    );
    expect(bookings.createReservation).not.toHaveBeenCalled();
  });
  it('never treats return query parameters as payment success', async () => {
    provider.receipts.mockResolvedValue([]);
    const result = await request(app.getHttpServer())
      .get(`/payments/${id}?success=true`)
      .set('Authorization', 'Bearer fixture')
      .expect(200);
    expect(result.body as unknown).toMatchObject({ status: 'PENDING' });
  });
  it('keeps stored status available when provider verification is delayed', async () => {
    provider.receipts.mockRejectedValue(new Error('private-provider-body'));
    expect(await service.status('guest', id)).toMatchObject({
      verificationDelayed: true,
      status: 'PENDING',
    });
    await post(`/payments/${id}/cancel`).send({}).expect(503);
    expect(repo.cancelCheckout).not.toHaveBeenCalled();
  });
  it('does not reconcile another environment or provider', async () => {
    repo.metadata.mockResolvedValue({
      provider: 'STRIPE',
      environment: 'live',
    });
    await expect(service.resume('guest', id, 'FULL')).rejects.toThrow(
      'another payment provider',
    );
    expect(provider.receipts).not.toHaveBeenCalled();
  });
  it('returns stored status before checkout has a payment and allows owned cancellation', async () => {
    repo.metadata.mockResolvedValue(null);
    expect(await service.status('guest', id)).toMatchObject({
      verificationDelayed: false,
    });
    await post(`/payments/${id}/cancel`).send({}).expect(201);
    expect(repo.cancelCheckout).toHaveBeenCalledWith(id, 'guest');
  });
  it('recovers by guest and quote and propagates sanitized errors', async () => {
    repo.recover.mockResolvedValue({ bookingId: id });
    await request(app.getHttpServer())
      .get(`/payments/recovery/${id}`)
      .set('Authorization', 'Bearer fixture')
      .expect(200);
    expect(repo.recover).toHaveBeenCalledWith('guest', id);
    repo.recover.mockRejectedValue(new Error('private-db-error'));
    await expect(service.recover('guest', id)).rejects.toThrow(
      'temporarily unavailable',
    );
  });
  it('accepts a public form-encoded callback only after verification and retrieval', async () => {
    await request(app.getHttpServer())
      .post('/payments/payhere/notify')
      .type('form')
      .send({ order_id: orderId })
      .expect(200);
    expect(provider.verify).toHaveBeenCalledWith({ order_id: orderId });
    expect(repo.settleReceipts).toHaveBeenCalledWith(
      id,
      orderId,
      'sandbox',
      expect.any(Array),
    );
    expect(email.send).toHaveBeenCalledWith(id);
  });
  it('rejects invalid callbacks, mismatched environments and uncorroborated references', async () => {
    provider.verify.mockImplementationOnce(() => {
      throw new BadRequestException('signature');
    });
    await request(app.getHttpServer())
      .post('/payments/payhere/notify')
      .send({})
      .expect(400);
    repo.locate.mockResolvedValueOnce({ bookingId: id, environment: 'live' });
    await request(app.getHttpServer())
      .post('/payments/payhere/notify')
      .send({})
      .expect(400);
    provider.receipts.mockResolvedValue([]);
    await request(app.getHttpServer())
      .post('/payments/payhere/notify')
      .send({})
      .expect(503);
    expect(email.send).not.toHaveBeenCalled();
  });
  it.each(['0', '-1', '-2'])(
    'does not release inventory or send confirmation on %s callbacks',
    async (status) => {
      provider.verify.mockReturnValue({ orderId, status });
      await service.notify({});
      expect(repo.settleReceipts).not.toHaveBeenCalled();
      expect(email.send).not.toHaveBeenCalled();
    },
  );
  it('marks review states and corroborates chargebacks', async () => {
    provider.verify.mockReturnValue({
      orderId,
      paymentId: '12345',
      amount: '20000.00',
      status: '-3',
    });
    await expect(service.notify({})).rejects.toThrow('not yet corroborated');
    provider.receipts.mockResolvedValue([
      { orderId, paymentId: '12345', amount: 2000000, status: 'CHARGEBACKED' },
    ]);
    repo.settleReceipts.mockResolvedValue({ reviewRequired: true });
    await service.notify({});
    repo.metadata.mockResolvedValue({
      provider: 'PAYHERE',
      environment: 'sandbox',
      paymentId: orderId,
      reviewRequired: true,
    });
    expect(await service.status('guest', id)).toMatchObject({
      paymentState: 'REVIEW_REQUIRED',
    });
  });
  it('refuses checkout if no stored guest email is available', async () => {
    repo.status.mockResolvedValue({});
    await expect(
      service.start('guest', { quoteToken: 'signed.preview' }, 'FULL', billing),
    ).rejects.toThrow('guest email');
  });
});
