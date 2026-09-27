import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

// Requires a real PostgreSQL database configured through DB_* variables
// (a local database, a Neon dev branch, or the CI postgres service).
describe('GET /health (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with database up given a reachable database', async () => {
    // Act
    const response = await request(app.getHttpServer()).get('/health');

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'hotel-website',
      database: 'up',
    });
  });

  it('returns 404 in the team error format given an unknown route', async () => {
    // Act
    const response = await request(app.getHttpServer()).get('/does-not-exist');

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'NOT_FOUND',
      message: 'Cannot GET /does-not-exist',
    });
  });
});
