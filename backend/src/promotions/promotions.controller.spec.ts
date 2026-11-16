import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import { PromotionRepository } from '../database/repositories/promotion.repository';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

describe('Public promotions (HTTP)', () => {
  let app: INestApplication<App>;
  const repository = { findActive: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PromotionsController],
      providers: [
        PromotionsService,
        { provide: PromotionRepository, useValue: repository },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });
  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    await app?.close();
  });

  it('allows public access, uses default limit and returns dates in the public contract', async () => {
    const row = {
      promoId: 'fixture',
      code: 'STAY10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      currency: 'LKR',
      roomTypeIds: [],
      validFrom: new Date('2026-01-01T00:00:00Z'),
      validUntil: new Date('2099-01-01T00:00:00Z'),
    };
    repository.findActive.mockResolvedValue([row]);
    const response = await request(app.getHttpServer()).get('/promotions');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      items: [
        {
          ...row,
          validFrom: row.validFrom.toISOString(),
          validUntil: row.validUntil.toISOString(),
        },
      ],
      nextCursor: null,
    });
    expect(repository.findActive).toHaveBeenCalledWith(20);
  });

  it('returns an empty list without inventing promotions', async () => {
    repository.findActive.mockResolvedValue([]);
    const response = await request(app.getHttpServer()).get(
      '/promotions?limit=100',
    );
    expect(response.body).toEqual({ items: [], nextCursor: null });
    expect(repository.findActive).toHaveBeenCalledWith(100);
  });

  it.each(['0', '-1', '101', '1.5', 'bad'])(
    'rejects invalid limit %s before querying',
    async (limit) => {
      const response = await request(app.getHttpServer()).get(
        `/promotions?limit=${limit}`,
      );
      expect(response.status).toBe(400);
      expect(repository.findActive).not.toHaveBeenCalled();
    },
  );

  it('does not accept unsupported publication or status filters', async () => {
    const response = await request(app.getHttpServer()).get(
      '/promotions?status=INACTIVE',
    );
    expect(response.status).toBe(400);
    expect(repository.findActive).not.toHaveBeenCalled();
  });

  it('reports database failure without leaking query or credentials', async () => {
    repository.findActive.mockRejectedValue(new Error('private SQL details'));
    const response = await request(app.getHttpServer()).get('/promotions');
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      error: 'DEPENDENCY_UNAVAILABLE',
      message: 'Promotions are temporarily unavailable.',
    });
    expect(JSON.stringify(response.body)).not.toContain('private SQL');
  });
});
