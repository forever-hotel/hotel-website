import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import { JwtTokenService } from '../common/utils/jwt-token.service';
import {
  BookingRepository,
  CheckoutRecord,
} from '../database/repositories/booking.repository';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { signQuote } from './quote-token';

describe('Checkout API using the existing bookings table', () => {
  let app: INestApplication<App>;
  const input = {
    roomTypeId: '11111111-1111-4111-8111-111111111111',
    checkInDate: '2099-12-10',
    checkOutDate: '2099-12-12',
    numberOfGuests: 2,
  };
  const secret = 'fixture-secret-for-checkout-tests-only-12345';
  const policy = {
    version: 'fixture-only',
    rateBasis: 'INCLUSIVE',
    charges: [],
  };
  const configuration = { get: jest.fn() };
  const repo = {
    transaction: jest.fn(),
    now: jest.fn(),
    rate: jest.fn(),
    available: jest.fn(),
    lockAttempt: jest.fn(),
    lockPreview: jest.fn(),
    reserve: jest.fn(),
  };
  const post = (path: string) =>
    request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer fixture');
  let token: string;
  const reserve = (
    body: object = { quoteToken: token },
    key = 'fixture-attempt-1',
  ) => post('/bookings').set('Idempotency-Key', key).send(body);
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        BookingsService,
        { provide: BookingRepository, useValue: repo },
        { provide: ConfigService, useValue: configuration },
        {
          provide: JwtTokenService,
          useValue: {
            verify: (value: string) =>
              value === 'fixture' ? { sub: 'guest-1' } : null,
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useLogger(false);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    configuration.get.mockImplementation((key: string) =>
      key === 'jwt.secret' ? secret : JSON.stringify(policy),
    );
    repo.transaction.mockImplementation((work: (manager: object) => unknown) =>
      work({}),
    );
    repo.rate.mockResolvedValue({ nightlyRate: 1000000, maxGuests: 2 });
    repo.now.mockImplementation(() => Promise.resolve(new Date()));
    repo.available.mockResolvedValue(1);
    repo.lockAttempt.mockResolvedValue(null);
    repo.lockPreview.mockResolvedValue(false);
    repo.reserve.mockResolvedValue(undefined);
    token = signQuote(
      {
        quoteId: '22222222-2222-4222-8222-222222222222',
        guestId: 'guest-1',
        input,
        pricing: {
          totalAmount: 2000000,
          nightlyRate: 1000000,
          currency: 'LKR',
        },
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      },
      secret,
    );
  });
  it('requires guest authentication', async () => {
    expect(
      (await request(app.getHttpServer()).post('/booking-quotes').send(input))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .post('/bookings')
          .send({ quoteToken: token })
      ).status,
    ).toBe(401);
  });
  it('returns a signed preview without creating a booking', async () => {
    const response = await post('/booking-quotes').send(input);
    expect(response.status).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({
      totalAmount: 2000000,
      currency: 'LKR',
    });
    expect((response.body as { quoteToken: string }).quoteToken).toContain('.');
    expect(repo.reserve).not.toHaveBeenCalled();
  });
  it.each([
    'guestId',
    'totalAmount',
    'childCount',
    'numberOfRooms',
    'mealPlan',
    'promoCode',
  ])('rejects unsupported quote input %s', async (field) => {
    expect(
      (await post('/booking-quotes').send({ ...input, [field]: 1 })).status,
    ).toBe(400);
  });
  it('validates dates, capacity and availability', async () => {
    expect(
      (
        await post('/booking-quotes').send({
          ...input,
          checkInDate: '2099-02-30',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post('/booking-quotes').send({
          ...input,
          checkInDate: '2000-01-01',
          checkOutDate: '2000-01-03',
        })
      ).status,
    ).toBe(400);
    expect(
      (await post('/booking-quotes').send({ ...input, numberOfGuests: 3 }))
        .status,
    ).toBe(400);
    repo.available.mockResolvedValue(0);
    expect((await reserve()).status).toBe(409);
    repo.rate.mockResolvedValue(null);
    expect((await reserve()).status).toBe(404);
  });
  it('freezes the old signed price despite later catalogue or policy changes', async () => {
    repo.rate.mockResolvedValue({ nightlyRate: 9990000, maxGuests: 2 });
    configuration.get.mockImplementation((key: string) =>
      key === 'jwt.secret' ? secret : 'invalid-new-pricing',
    );
    const response = await reserve();
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      totalAmount: 2000000,
      status: 'PENDING',
      paidAmount: 0,
    });
    const saved = (
      repo.reserve.mock.calls[0] as unknown[]
    )[1] as CheckoutRecord;
    expect(saved.priceSnapshot.nightlyRate).toBe(1000000);
    expect(saved.holdExpiresAt).toBeInstanceOf(Date);
  });
  it('replays the same booking without another insert and rejects changed requests', async () => {
    const first = await reserve();
    const saved = (
      repo.reserve.mock.calls[0] as unknown[]
    )[1] as CheckoutRecord;
    repo.lockAttempt.mockResolvedValue(saved);
    repo.reserve.mockClear();
    expect((await reserve()).body).toEqual(first.body);
    expect(repo.reserve).not.toHaveBeenCalled();
    expect(
      (await reserve({ quoteToken: token, specialRequests: 'Different' }))
        .status,
    ).toBe(409);
    repo.lockAttempt.mockResolvedValue({
      ...saved,
      holdExpiresAt: new Date(0),
    });
    expect((await reserve()).body).toMatchObject({ error: 'HOLD_EXPIRED' });
    repo.lockAttempt.mockResolvedValue({
      ...saved,
      status: 'CONFIRMED',
      holdExpiresAt: new Date(0),
    });
    expect((await reserve()).body).toMatchObject({
      status: 'CONFIRMED',
      bookingId: saved.bookingId,
    });
  });
  it('rejects a consumed preview under a different key', async () => {
    repo.lockPreview.mockResolvedValue(true);
    expect((await reserve()).body).toMatchObject({
      error: 'QUOTE_ALREADY_USED',
    });
  });
  it('rejects invalid, cross-guest, expired and tampered previews', async () => {
    expect(
      (await reserve({ quoteToken: token.slice(0, -4) + 'xxxx' })).status,
    ).toBe(404);
    const other = signQuote(
      {
        quoteId: 'q',
        guestId: 'guest-2',
        input,
        pricing: { totalAmount: 1 },
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
      secret,
    );
    expect((await reserve({ quoteToken: other })).status).toBe(404);
    const expired = signQuote(
      {
        quoteId: 'q',
        guestId: 'guest-1',
        input,
        pricing: { totalAmount: 1 },
        expiresAt: new Date(0).toISOString(),
      },
      secret,
    );
    expect((await reserve({ quoteToken: expired })).body).toMatchObject({
      error: 'QUOTE_EXPIRED',
    });
    expect((await reserve({ quoteId: 'old-contract' })).status).toBe(400);
  });
  it('requires a valid request key and rejects raw card details', async () => {
    expect((await post('/bookings').send({ quoteToken: token })).status).toBe(
      400,
    );
    expect((await reserve({ quoteToken: token }, 'bad')).status).toBe(400);
    expect(
      (await reserve({ quoteToken: token, cardNumber: 'fixture' })).status,
    ).toBe(400);
  });
  it('reports storage and pricing outages explicitly', async () => {
    configuration.get.mockReturnValue(undefined);
    expect((await post('/booking-quotes').send(input)).status).toBe(503);
    configuration.get.mockImplementation((key: string) =>
      key === 'jwt.secret' ? secret : JSON.stringify(policy),
    );
    repo.transaction.mockRejectedValue(new Error('private storage failure'));
    expect((await reserve()).body).toMatchObject({
      error: 'BOOKING_UNAVAILABLE',
    });
  });
});
