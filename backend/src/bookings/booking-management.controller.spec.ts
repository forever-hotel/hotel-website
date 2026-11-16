import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import { JwtTokenService } from '../common/utils/jwt-token.service';
import { BookingManagementController } from './booking-management.controller';
import { BookingManagementService } from './booking-management.service';

describe('Booking management HTTP contract', () => {
  let app: INestApplication<App>;
  const id = '11111111-1111-4111-8111-111111111111';
  const service = {
    options: jest.fn(),
    quote: jest.fn(),
    modify: jest.fn(),
    cancel: jest.fn(),
  };
  const post = (route: string, body: object) =>
    request(app.getHttpServer())
      .post(`/bookings/${id}/${route}`)
      .set('Authorization', 'Bearer owner')
      .set('Idempotency-Key', 'http-request-key')
      .send(body);
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BookingManagementController],
      providers: [
        { provide: BookingManagementService, useValue: service },
        {
          provide: JwtTokenService,
          useValue: {
            verify: (token: string) =>
              token === 'owner' ? { sub: 'guest-owner' } : null,
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    for (const method of Object.values(service))
      method.mockResolvedValue({ bookingId: id });
  });
  it('requires authentication on every operation', async () => {
    expect(
      (await request(app.getHttpServer()).get(`/bookings/${id}/management`))
        .status,
    ).toBe(401);
    for (const route of ['change-quote', 'changes', 'cancellations'])
      expect(
        (
          await request(app.getHttpServer())
            .post(`/bookings/${id}/${route}`)
            .send({})
        ).status,
      ).toBe(401);
    for (const method of Object.values(service))
      expect(method).not.toHaveBeenCalled();
  });
  it('forwards only token identity, validated payloads and the request key', async () => {
    const read = await request(app.getHttpServer())
      .get(`/bookings/${id}/management`)
      .set('Authorization', 'Bearer owner');
    expect(read.status).toBe(200);
    expect(read.headers['cache-control']).toBe('no-store');
    expect(service.options).toHaveBeenCalledWith('guest-owner', id);
    const quote = {
      roomTypeId: id,
      checkInDate: '2099-12-10',
      checkOutDate: '2099-12-12',
      numberOfGuests: 2,
    };
    expect((await post('change-quote', quote)).status).toBe(200);
    expect(service.quote).toHaveBeenCalledWith('guest-owner', id, quote);
    expect((await post('changes', { quoteToken: 'signed.token' })).status).toBe(
      200,
    );
    expect(service.modify).toHaveBeenCalledWith(
      'guest-owner',
      id,
      'signed.token',
      'http-request-key',
    );
    expect((await post('cancellations', { revision: 0 })).status).toBe(200);
    expect(service.cancel).toHaveBeenCalledWith(
      'guest-owner',
      id,
      0,
      'http-request-key',
    );
  });
  it.each([
    { revision: -1 },
    { revision: 0.5 },
    { revision: '0' },
    { revision: 0, guestId: 'other' },
    { revision: 0, refundAmount: 100 },
  ])('rejects invalid cancellation payload %j', async (body) => {
    expect((await post('cancellations', body)).status).toBe(400);
    expect(service.cancel).not.toHaveBeenCalled();
  });
  it('rejects malformed dates, tokens and client-owned prices', async () => {
    expect((await post('changes', { quoteToken: 'invalid' })).status).toBe(400);
    expect(
      (
        await post('change-quote', {
          roomTypeId: id,
          checkInDate: '2099-02-30',
          checkOutDate: '2099-03-04',
          numberOfGuests: 2,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post('change-quote', {
          roomTypeId: id,
          checkInDate: '2099-12-10',
          checkOutDate: '2099-12-12',
          numberOfGuests: 2,
          totalAmount: 1,
        })
      ).status,
    ).toBe(400);
    expect(service.quote).not.toHaveBeenCalled();
    expect(service.modify).not.toHaveBeenCalled();
  });
  it('validates UUIDs before reaching the service', async () => {
    expect(
      (
        await request(app.getHttpServer())
          .get('/bookings/not-uuid/management')
          .set('Authorization', 'Bearer owner')
      ).status,
    ).toBe(400);
    expect(service.options).not.toHaveBeenCalled();
  });
});
