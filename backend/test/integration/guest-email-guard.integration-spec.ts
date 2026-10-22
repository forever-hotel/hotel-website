import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { Guest } from '../../src/guests/entities/guest.entity';
import { GuestRepository } from '../../src/database/repositories/guest.repository';
import { EmailAlreadyRegisteredError } from '../../src/guests/errors/email-already-registered.error';

describe('Guest email guard without an infra unique index', () => {
  let app: INestApplication;
  let source: DataSource;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
    source = app.get(DataSource);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('rejects repeat/case-variant emails in a temporary table with no unique email index', async () => {
    await source.transaction(async (manager) => {
      // Temporary copy only: real account rows are never created or changed.
      await manager.query(
        'CREATE TEMP TABLE guests (LIKE public.guests INCLUDING DEFAULTS) ON COMMIT DROP',
      );
      const repository = new GuestRepository(manager.getRepository(Guest));
      const input = {
        fullName: 'Fixture Guest',
        email: 'fixture@example.invalid',
        passwordHash: 'fixture-hash',
      };
      await repository.create(input);
      await expect(
        repository.create({ ...input, email: ' FIXTURE@EXAMPLE.INVALID ' }),
      ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
      const rows = await manager.query<{ count: number }[]>(
        'SELECT count(*)::int AS count FROM pg_temp.guests',
      );
      expect(rows[0].count).toBe(1);
      await manager.query(
        'INSERT INTO pg_temp.guests (full_name, email, password_hash) VALUES ($1, $2, $3)',
        ['Legacy Duplicate', 'FIXTURE@EXAMPLE.INVALID', 'fixture-hash'],
      );
      expect(
        await repository.findByEmailForAuthentication(input.email),
      ).toBeNull();
    });
  });
});
