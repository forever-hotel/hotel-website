import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let query: jest.Mock;
  let service: DatabaseService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    query = jest.fn();
    service = new DatabaseService({ query } as unknown as DataSource);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return true given the database answers the probe query', async () => {
    // Arrange
    query.mockResolvedValue([{ '?column?': 1 }]);

    // Act
    const healthy = await service.isHealthy();

    // Assert
    expect(healthy).toBe(true);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('should return false without logging connection details given the query fails', async () => {
    // Arrange
    query.mockRejectedValue(
      new Error('connect ECONNREFUSED ep-secret-host.neon.tech'),
    );

    // Act
    const healthy = await service.isHealthy();

    // Assert
    expect(healthy).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      'Database health check failed: Error',
    );
  });
});
