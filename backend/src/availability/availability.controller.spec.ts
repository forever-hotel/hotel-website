import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import { AvailabilityRepository } from '../database/repositories/availability.repository';
import type { InventorySnapshot } from '../database/repositories/availability.repository';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

describe('Availability API (HTTP)', () => {
  let app: INestApplication<App>;
  const repository = { snapshot: jest.fn() };
  const id = '11111111-1111-4111-8111-111111111111';
  const query = {
    roomTypeId: id,
    checkInDate: '2026-12-10',
    checkOutDate: '2026-12-12',
    numberOfGuests: 2,
  };
  let snapshot: InventorySnapshot;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AvailabilityController],
      providers: [
        AvailabilityService,
        { provide: AvailabilityRepository, useValue: repository },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useLogger(false);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    snapshot = {
      maxGuests: 2,
      rooms: [
        { roomNumber: '101', status: 'VACANT' },
        { roomNumber: '102', status: 'REQUIRES_CLEANING' },
        { roomNumber: '103', status: 'UNDER_MAINTENANCE' },
      ],
      bookings: [],
    };
    repository.snapshot.mockImplementation(() => Promise.resolve(snapshot));
  });

  it('excludes maintenance and reports the full stay capacity', async () => {
    const response = await request(app.getHttpServer())
      .get('/availability')
      .query(query);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ...query, availableCount: 2 });
  });

  it('does not confuse daily capacity with a continuous room', async () => {
    snapshot.bookings = [
      {
        roomNumber: '101',
        checkInDate: '2026-12-10',
        checkOutDate: '2026-12-11',
      },
      {
        roomNumber: '102',
        checkInDate: '2026-12-11',
        checkOutDate: '2026-12-12',
      },
    ];
    const stay = await request(app.getHttpServer())
      .get('/availability')
      .query(query);
    expect((stay.body as { availableCount: number }).availableCount).toBe(0);
    const calendar = await request(app.getHttpServer())
      .get(`/room-types/${id}/availability-calendar`)
      .query({ from: query.checkInDate, to: query.checkOutDate });
    expect(calendar.status).toBe(200);
    expect((calendar.body as { days: unknown[] }).days).toEqual([
      { date: '2026-12-10', availableCount: 1, status: 'AVAILABLE' },
      { date: '2026-12-11', availableCount: 1, status: 'AVAILABLE' },
    ]);
  });

  it('subtracts unassigned reservations and never returns a negative count', async () => {
    snapshot.bookings = Array.from({ length: 3 }, () => ({
      roomNumber: null,
      checkInDate: '2026-12-10',
      checkOutDate: '2026-12-12',
    }));
    const response = await request(app.getHttpServer())
      .get('/availability')
      .query(query);
    expect((response.body as { availableCount: number }).availableCount).toBe(
      0,
    );
    const calendar = await request(app.getHttpServer())
      .get(`/room-types/${id}/availability-calendar`)
      .query({ from: '2026-12-10', to: '2026-12-11' });
    expect((calendar.body as { days: unknown[] }).days).toEqual([
      { date: '2026-12-10', availableCount: 0, status: 'BLOCKED' },
    ]);
  });

  it('allows adjacent bookings and counts each assigned room once', async () => {
    snapshot.bookings = [
      {
        roomNumber: '101',
        checkInDate: '2026-12-08',
        checkOutDate: '2026-12-10',
      },
      {
        roomNumber: '102',
        checkInDate: '2026-12-12',
        checkOutDate: '2026-12-13',
      },
    ];
    const response = await request(app.getHttpServer())
      .get('/availability')
      .query(query);
    expect((response.body as { availableCount: number }).availableCount).toBe(
      2,
    );
  });

  it.each([
    { checkInDate: '2026-02-30' },
    { checkInDate: '2026-12-10T00:00:00Z' },
    { checkOutDate: '2026-12-10' },
    { checkOutDate: '2026-12-09' },
    { checkOutDate: '2027-12-12' },
    { roomTypeId: 'invalid' },
    { numberOfGuests: 0 },
    { numberOfGuests: 1.5 },
    { unexpected: 'field' },
  ])('rejects invalid query %j before reading inventory', async (invalid) => {
    const response = await request(app.getHttpServer())
      .get('/availability')
      .query({ ...query, ...invalid });
    expect(response.status).toBe(400);
    expect((response.body as { error: string }).error).toBe(
      'VALIDATION_FAILED',
    );
    expect(repository.snapshot).not.toHaveBeenCalled();
  });

  it('rejects occupancy above room capacity', async () => {
    const response = await request(app.getHttpServer())
      .get('/availability')
      .query({ ...query, numberOfGuests: 3 });
    expect(response.status).toBe(400);
    expect((response.body as { error: string }).error).toBe(
      'CAPACITY_EXCEEDED',
    );
  });

  it('returns 404 for an unknown type', async () => {
    repository.snapshot.mockResolvedValue(null);
    expect(
      (await request(app.getHttpServer()).get('/availability').query(query))
        .status,
    ).toBe(404);
  });

  it('returns 503 rather than false availability on inventory failure', async () => {
    repository.snapshot.mockRejectedValue(new Error('private database detail'));
    const response = await request(app.getHttpServer())
      .get('/availability')
      .query(query);
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'INVENTORY_UNAVAILABLE',
      message: 'Room availability cannot be checked right now.',
    });
  });
});
