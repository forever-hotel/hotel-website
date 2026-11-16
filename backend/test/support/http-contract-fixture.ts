import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PROJECT_MANAGEMENT_POLICY } from '../../src/bookings/management-policy';
import { ensureTemporaryCheckoutSchema } from './checkout-fixture';
import configuration from '../../src/config/configuration';

const TABLES = [
  'guests',
  'room_types',
  'room_type_images',
  'room_type_amenities',
  'rooms',
  'bookings',
  'payments',
  'mad_promotion_codes',
  'mad_promotion_room_types',
] as const;

/** Real application wiring; every ORM and raw SQL path uses one temporary-table connection. */
export class HttpContractFixture {
  app: INestApplication<App>;
  runner: QueryRunner;
  config: ConfigService;
  private owner: INestApplication;

  async open() {
    if (configuration().database.synchronize)
      throw new Error('HTTP contract tests require DB_SYNCHRONIZE=false.');
    const connectionModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    this.owner = connectionModule.createNestApplication();
    this.owner.useLogger(false);
    await this.owner.init();
    const original = this.owner.get(DataSource);
    this.runner = original.createQueryRunner();
    await this.runner.connect();
    const runner = this.runner;
    const isolated = new Proxy(original, {
      get(target, property): unknown {
        if (property === 'query')
          return (sql: string, params?: unknown[]) => runner.query(sql, params);
        if (property === 'manager') return runner.manager;
        if (property === 'getRepository')
          return runner.manager.getRepository.bind(runner.manager);
        if (property === 'transaction')
          return (
            first: string | ((manager: EntityManager) => Promise<unknown>),
            second?: (manager: EntityManager) => Promise<unknown>,
          ) =>
            runner.manager.transaction(
              typeof first === 'function' ? first : second!,
            );
        // This proxy borrows the owner's connection; only owner.close() destroys it.
        if (property === 'destroy') return () => Promise.resolve();
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    this.config = new ConfigService({
      app: this.owner.get(ConfigService).getOrThrow<unknown>('app'),
      database: this.owner.get(ConfigService).getOrThrow<unknown>('database'),
      jwt: {
        secret: 'http-contract-fixture-signing-secret-at-least-32-chars',
        issuer: 'http-contract-fixture',
      },
      NODE_ENV: 'test',
      BOOKING_PRICING_POLICY: JSON.stringify({
        version: 'contract-fixture',
        rateBasis: 'INCLUSIVE',
        charges: [],
      }),
      BOOKING_MANAGEMENT_POLICY: JSON.stringify(PROJECT_MANAGEMENT_POLICY),
      BOOKING_EMAIL_MODE: 'sandbox',
      BREVO_API_KEY: 'fixture-only',
      BOOKING_EMAIL_FROM: 'hotel@example.invalid',
      CONTACT_EMAIL_MODE: 'sandbox',
      CONTACT_EMAIL_FROM: 'hotel@example.invalid',
      CONTACT_EMAIL_TO: 'manager@example.invalid',
      PAYHERE_MODE: 'sandbox',
      PAYHERE_MERCHANT_ID: '123456',
      PAYHERE_MERCHANT_SECRET: 'fixture-only-merchant-secret',
      PAYHERE_APP_ID: 'fixture-only-app',
      PAYHERE_APP_SECRET: 'fixture-only-app-secret',
      PAYHERE_NOTIFY_URL: 'https://contract.example/hw/payments/payhere/notify',
      PAYMENT_RETURN_ORIGIN: 'http://localhost:3001',
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(isolated)
      .overrideProvider(ConfigService)
      .useValue(this.config)
      .compile();
    this.app = module.createNestApplication<App>();
    this.app.useLogger(false);
    // Model the browser-facing prefix. Actual gateway routing remains tested in api-gateway.
    this.app.setGlobalPrefix('hw');
    await this.app.init();
  }

  async reset() {
    await this.runner.startTransaction();
    for (const table of TABLES)
      await this.runner.query(
        `CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`,
      );
    const [isolation] = (await this.runner.query(
      "SELECT bool_and(relpersistence='t') AS temporary FROM pg_class WHERE oid=ANY($1::regclass[])",
      [TABLES.map((table) => `pg_temp.${table}`)],
    )) as { temporary: boolean }[];
    if (!isolation.temporary)
      throw new Error('Contract fixtures must be temporary tables.');
    await ensureTemporaryCheckoutSchema(this.runner);
    await this.runner.query(
      "CREATE TYPE pg_temp.payment_method AS ENUM ('STRIPE','CASH','CARD_ON_SITE','PAYHERE')",
    );
    await this.runner.query(
      'ALTER TABLE pg_temp.payments ALTER COLUMN payment_method TYPE pg_temp.payment_method USING payment_method::text::pg_temp.payment_method',
    );
  }
  async rollback() {
    if (this.runner?.isTransactionActive)
      await this.runner.rollbackTransaction();
  }
  async close() {
    await this.rollback();
    await this.app?.close();
    await this.runner?.release();
    await this.owner?.close();
  }
}
