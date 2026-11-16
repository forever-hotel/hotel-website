import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import { RoomTypeRepository } from '../database/repositories/room-type.repository';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';

describe('RoomTypesController (HTTP)', () => {
  let app: INestApplication<App>;
  const repository = { findAll: jest.fn(), findById: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RoomTypesController],
      providers: [
        RoomTypesService,
        { provide: RoomTypeRepository, useValue: repository },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    await app?.close();
  });

  it('should allow public catalogue access given no token', async () => {
    repository.findAll.mockResolvedValue([]);

    const response = await request(app.getHttpServer()).get('/room-types');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], nextCursor: null });
  });

  it('should reject an invalid UUID before querying the database', async () => {
    const response = await request(app.getHttpServer()).get(
      '/room-types/not-a-uuid',
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'VALIDATION_FAILED' });
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('should return the documented error given an unknown UUID', async () => {
    repository.findById.mockResolvedValue(null);

    const response = await request(app.getHttpServer()).get(
      '/room-types/11111111-1111-4111-8111-111111111111',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'ROOM_TYPE_NOT_FOUND',
      message: 'The requested room type does not exist.',
    });
  });

  it('should return public details given a known UUID', async () => {
    const roomTypeId = '11111111-1111-4111-8111-111111111111';
    repository.findById.mockResolvedValue({
      roomTypeId,
      typeName: 'Deluxe',
      description: null,
      pricePerNight: 250000,
      maxGuests: 2,
      images: [],
      amenities: [],
    });

    const response = await request(app.getHttpServer()).get(
      `/room-types/${roomTypeId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      roomTypeId,
      typeName: 'Deluxe',
      description: null,
      pricePerNight: 250000,
      currency: 'LKR',
      maxGuests: 2,
      imageUrls: [],
      amenities: [],
    });
  });
});
