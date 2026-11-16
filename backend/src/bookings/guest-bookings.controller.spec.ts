import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import { JwtTokenService } from '../common/utils/jwt-token.service';
import { GuestBookingsController } from './guest-bookings.controller';
import { GuestBookingsRepository } from './guest-bookings.repository';

describe('Guest booking reads', () => {
  let app: INestApplication<App>;
  const id = '11111111-1111-4111-8111-111111111111';
  const repository = { list: jest.fn(), detail: jest.fn() };
  const get = (path: string, token = 'owner') =>
    request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GuestBookingsController],
      providers: [
        { provide: GuestBookingsRepository, useValue: repository },
        {
          provide: JwtTokenService,
          useValue: {
            verify: (token: string) =>
              ['owner', 'other'].includes(token) ? { sub: token } : null,
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    app.useLogger(false);
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    repository.list.mockResolvedValue({
      items: [],
      counts: { total: 0, upcoming: 0, past: 0, cancelled: 0 },
      category: 'upcoming',
      page: 1,
      pageSize: 20,
    });
    repository.detail.mockImplementation((guest: string, booking: string) =>
      Promise.resolve(
        guest === 'owner' && booking === id
          ? { bookingId: id, status: 'CONFIRMED' }
          : null,
      ),
    );
  });
  it('requires authentication for both reads', async () => {
    for (const path of ['/bookings', `/bookings/${id}`]) {
      expect((await request(app.getHttpServer()).get(path)).status).toBe(401);
      expect((await get(path, 'invalid')).status).toBe(401);
    }
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.detail).not.toHaveBeenCalled();
  });
  it('uses token identity and defaults, with private cache policy', async () => {
    const response = await get('/bookings');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect((response.body as { items: unknown[] }).items).toEqual([]);
    expect(repository.list).toHaveBeenCalledWith('owner', 'upcoming', 1);
    await get('/bookings?category=past&page=2', 'other');
    expect(repository.list).toHaveBeenLastCalledWith('other', 'past', 2);
  });
  it.each([
    'page=0',
    'page=-1',
    'page=1.5',
    'page=NaN',
    'page=1000001',
    'category=all',
    'guestId=owner',
  ])('rejects invalid or identity-changing queries: %s', async (query) => {
    expect((await get(`/bookings?${query}`)).status).toBe(400);
    expect(repository.list).not.toHaveBeenCalled();
  });
  it('returns only an owned detail; unowned and missing IDs have the same response', async () => {
    const own = await get(`/bookings/${id}`);
    expect(own.status).toBe(200);
    expect(own.headers['cache-control']).toBe('no-store');
    expect(repository.detail).toHaveBeenCalledWith('owner', id);
    const unowned = await get(`/bookings/${id}`, 'other');
    const missing = await get('/bookings/22222222-2222-4222-8222-222222222222');
    expect(unowned.status).toBe(404);
    expect(unowned.body).toEqual(missing.body);
  });
  it('rejects malformed IDs without reading storage', async () => {
    expect((await get('/bookings/not-an-id')).status).toBe(400);
    expect(repository.detail).not.toHaveBeenCalled();
  });
  it('does not leak database errors or report an outage as an empty history', async () => {
    repository.list.mockRejectedValue(new Error('private connection detail'));
    const response = await get('/bookings');
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toContain('private connection');
    repository.detail.mockRejectedValue(new Error('private query'));
    expect((await get(`/bookings/${id}`)).status).toBe(503);
  });
});
