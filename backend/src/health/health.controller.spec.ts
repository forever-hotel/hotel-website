import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DatabaseService } from '../database/database.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let isHealthy: jest.Mock;

  beforeEach(async () => {
    isHealthy = jest.fn();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DatabaseService, useValue: { isHealthy } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => ({ serviceName: 'hotel-website' }) },
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('should report ok given a reachable database', async () => {
    // Arrange
    isHealthy.mockResolvedValue(true);

    // Act
    const result = await controller.check();

    // Assert
    expect(result).toEqual({
      status: 'ok',
      service: 'hotel-website',
      database: 'up',
    });
  });

  it('should throw 503 DATABASE_UNAVAILABLE given an unreachable database', async () => {
    // Arrange
    isHealthy.mockResolvedValue(false);

    // Act
    const result = controller.check();

    // Assert
    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(result).rejects.toMatchObject({
      response: { error: 'DATABASE_UNAVAILABLE' },
    });
  });
});

describe('Health HTTP routes', () => {
  let app: INestApplication<App>;
  const isHealthy = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DatabaseService, useValue: { isHealthy } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => ({ serviceName: 'hotel-website' }) },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(['/health', '/health/ready'])(
    'should return database readiness for %s given a reachable database',
    async (path) => {
      isHealthy.mockResolvedValue(true);
      const response = await request(app.getHttpServer()).get(path);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'hotel-website',
        database: 'up',
      });
    },
  );

  it.each(['/health', '/health/ready'])(
    'should return 503 for %s given an unreachable database',
    async (path) => {
      isHealthy.mockResolvedValue(false);
      const response = await request(app.getHttpServer()).get(path);
      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({ error: 'DATABASE_UNAVAILABLE' });
    },
  );
});
