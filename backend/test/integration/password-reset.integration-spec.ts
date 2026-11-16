import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Guest } from '../../src/guests/entities/guest.entity';
import { GuestRepository } from '../../src/database/repositories/guest.repository';
import { GuestsController } from '../../src/guests/guests.controller';
import { GuestsService } from '../../src/guests/guests.service';
import { PasswordHasher } from '../../src/guests/password-hasher.service';
import { PasswordResetService } from '../../src/guests/password-reset.service';
import { JwtTokenService } from '../../src/common/utils/jwt-token.service';

describe('Password recovery HTTP and database integration', () => {
  let owner: INestApplication;
  let app: INestApplication;
  let runner: QueryRunner;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const email = 'password-reset-fixture@example.com';
  const originalPassword = 'original fixture passphrase';
  const password = 'new fixture passphrase';
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    owner = module.createNestApplication();
    owner.useLogger(false);
    await owner.init();
    runner = owner.get(DataSource).createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(
      'CREATE TEMP TABLE guests (LIKE public.guests INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP',
    );
    const repository = new GuestRepository(runner.manager.getRepository(Guest));
    const hasher = new PasswordHasher();
    const config = new ConfigService({
      jwt: {
        secret: 'password-recovery-fixture-secret-32-characters',
        issuer: 'recovery-fixture',
      },
      PASSWORD_RESET_ORIGIN: 'http://localhost:3001',
      NODE_ENV: 'test',
      BREVO_API_KEY: 'fixture-key',
      CONTACT_EMAIL_FROM: 'hotel@example.com',
    });
    const jwt = new JwtTokenService(config);
    const service = new GuestsService(repository, hasher, jwt);
    await service.register({
      fullName: 'Recovery Guest',
      email,
      password: originalPassword,
    });
    const httpModule = await Test.createTestingModule({
      controllers: [GuestsController],
      providers: [
        { provide: GuestsService, useValue: service },
        {
          provide: PasswordResetService,
          useValue: new PasswordResetService(repository, hasher, config),
        },
        { provide: JwtTokenService, useValue: jwt },
      ],
    }).compile();
    app = httpModule.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 201 }));
  }, 60000);
  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    if (runner && !runner.isReleased) await runner.release();
    await owner?.close();
  });
  it('delivers a link, changes the password, rejects the old password and refuses reuse', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/guests/forgot-password')
      .send({ email: 'not-an-email' })
      .expect(400);
    const known = await request(server)
      .post('/guests/forgot-password')
      .send({ email })
      .expect(200);
    const unknown = await request(server)
      .post('/guests/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(200);
    expect(known.body).toEqual(unknown.body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      textContent: string;
    };
    const token = body.textContent.match(/#token=(\S+)/)![1];
    await request(server)
      .post('/guests/reset-password')
      .send({ token, password: 'short' })
      .expect(400);
    await request(server)
      .post('/guests/reset-password')
      .send({ token, password })
      .expect(200);
    await request(server)
      .post('/guests/reset-password')
      .send({ token, password })
      .expect(400);
    await request(server)
      .post('/guests/login')
      .send({ email, password: originalPassword })
      .expect(401);
    const login = await request(server)
      .post('/guests/login')
      .send({ email, password })
      .expect(200);
    expect(login.body).toHaveProperty('accessToken');
    expect(JSON.stringify(login.body)).not.toContain('passwordHash');
    const [stored] = (await runner.query(
      'SELECT password_hash FROM pg_temp.guests WHERE email = $1',
      [email],
    )) as { password_hash: string }[];
    expect(stored.password_hash).not.toBe(password);
    expect(
      await new PasswordHasher().compare(password, stored.password_hash),
    ).toBe(true);
  });
});
