import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
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
