import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { JwtTokenService } from '../../src/common/utils/jwt-token.service';
import type { GuestAuthResponseDto } from '../../src/guests/dto/guest-auth-response.dto';
import { Guest } from '../../src/guests/entities/guest.entity';

describe('guest authentication (integration)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtTokenService: JwtTokenService;
  const createdEmails: string[] = [];

  const newGuest = () => ({
    fullName: 'Authentication Guest',
    email: `auth-${randomUUID()}@example.com`,
    password: 'a long passphrase',
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    jwtTokenService = app.get(JwtTokenService);
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await dataSource
        .getRepository(Guest)
        .createQueryBuilder()
        .delete()
        .where('email IN (:...emails)', { emails: createdEmails })
        .execute();
    }
    await app?.close();
  });

  it('should issue a JWT and return the authenticated profile given valid credentials', async () => {
    // Arrange
    const guest = newGuest();
    createdEmails.push(guest.email);
    await request(app.getHttpServer())
      .post('/guests/register')
      .send(guest)
      .expect(201);

    // Act
    const login = await request(app.getHttpServer())
      .post('/guests/login')
      .send({ email: guest.email, password: guest.password });

    // Assert
    expect(login.status).toBe(200);
    const loginBody = login.body as GuestAuthResponseDto;
    expect(login.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 86400,
      guest: {
        email: guest.email,
        fullName: guest.fullName,
      },
    });
    expect(loginBody.accessToken).toEqual(expect.any(String));
    expect(JSON.stringify(login.body)).not.toMatch(/password|passphrase/i);

    const claims = jwtTokenService.verify(loginBody.accessToken);
    expect(claims).toMatchObject({
      sub: loginBody.guest.guestId,
      role: 'GUEST',
    });

    const profile = await request(app.getHttpServer())
      .get('/guests/me')
      .set('Authorization', `Bearer ${loginBody.accessToken}`);
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject(loginBody.guest);
    expect(JSON.stringify(profile.body)).not.toMatch(/password|passphrase/i);
  });

  it('should return the same unauthorized error given an unknown email or wrong password', async () => {
    // Arrange
    const guest = newGuest();
    createdEmails.push(guest.email);
    await request(app.getHttpServer())
      .post('/guests/register')
      .send(guest)
      .expect(201);

    // Act
    const wrongPassword = await request(app.getHttpServer())
      .post('/guests/login')
      .send({ email: guest.email, password: 'incorrect password' });
    const unknownEmail = await request(app.getHttpServer())
      .post('/guests/login')
      .send({
        email: `unknown-${randomUUID()}@example.com`,
        password: guest.password,
      });

    // Assert
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it.each([
    ['no token', undefined],
    ['malformed token', 'Bearer not-a-jwt'],
    ['expired token', 'expired'],
  ])('should return 401 given %s', async (scenario, authorization) => {
    // Arrange
    let header = authorization;
    if (scenario === 'expired token') {
      const guestId = '5dce7d08-2686-4afb-a663-f3c21a7b6632';
      header = `Bearer ${jwtTokenService.issue(guestId, 1)}`;
    }

    // Act
    const response = await request(app.getHttpServer())
      .get('/guests/me')
      .set(header ? 'Authorization' : 'X-Test-Header', header ?? 'none');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'UNAUTHORIZED',
      message: 'A valid bearer token is required.',
    });
  });
});
