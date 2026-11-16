import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRounds } from 'bcryptjs';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { BCRYPT_COST } from '../../src/config/constants';
import { Guest } from '../../src/guests/entities/guest.entity';

// POST /guests/register (HW-06) against a database created from
// database/infra-schema/. Deletes only the guests it created.
describe('POST /guests/register (integration)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const createdEmails: string[] = [];

  const testEmail = () => `it-${randomUUID()}@example.com`;
  const validBody = (email: string) => ({
    fullName: 'Integration Guest',
    email,
    password: 'a long passphrase',
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
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
    // app is undefined when startup failed (e.g. database unreachable).
    await app?.close();
  });

  it('should return 201 with the public guest fields and store a bcrypt hash given valid details', async () => {
    // Arrange
    const email = testEmail();
    createdEmails.push(email);

    // Act
    const response = await request(app.getHttpServer())
      .post('/guests/register')
      .send({ ...validBody(email.toUpperCase()), phone: '+94771234567' });

    // Assert
    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      guestId: expect.any(String) as string,
      fullName: 'Integration Guest',
      email,
      createdAt: expect.any(String) as string,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|passphrase/i);

    const stored = await dataSource
      .getRepository(Guest)
      .createQueryBuilder('guest')
      .addSelect('guest.passwordHash')
      .where('guest.email = :email', { email })
      .getOneOrFail();
    expect(stored.passwordHash).not.toBe('a long passphrase');
    expect(getRounds(stored.passwordHash ?? '')).toBe(BCRYPT_COST);
    expect(stored.phone).toBe('+94771234567');
  });

  it('should return 409 EMAIL_ALREADY_REGISTERED given the email is used in a different case', async () => {
    // Arrange
    const email = testEmail();
    createdEmails.push(email);
    await request(app.getHttpServer())
      .post('/guests/register')
      .send(validBody(email))
      .expect(201);

    // Act
    const response = await request(app.getHttpServer())
      .post('/guests/register')
      .send(validBody(email.toUpperCase()));

    // Assert
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'EMAIL_ALREADY_REGISTERED',
      message: 'An account with this email already exists.',
    });
    const count = await dataSource
      .getRepository(Guest)
      .createQueryBuilder('guest')
      .where('guest.email = :email', { email })
      .getCount();
    expect(count).toBe(1);
  });

  it('should return 400 VALIDATION_FAILED and save nothing given invalid details', async () => {
    // Arrange
    const email = `invalid-${randomUUID()}`;

    // Act
    const response = await request(app.getHttpServer())
      .post('/guests/register')
      .send({ fullName: 'Guest 123', email, password: 'short' });

    // Assert
    const body = response.body as { error: string; message: string };
    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_FAILED');
    expect(body.message).toContain('email');
    expect(body.message).toContain('password');
    const count = await dataSource
      .getRepository(Guest)
      .createQueryBuilder('guest')
      .where('guest.email = :email', { email })
      .getCount();
    expect(count).toBe(0);
  });

  it('should return 400 given an unknown field such as a role', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/guests/register')
      .send({ ...validBody(testEmail()), role: 'ADMIN' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'VALIDATION_FAILED',
      message: 'property role should not exist',
    });
  });
});
