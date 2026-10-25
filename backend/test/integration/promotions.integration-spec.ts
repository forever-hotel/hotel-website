import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { PromotionRepository } from '../../src/database/repositories/promotion.repository';

describe('Promotion reads (temporary PostgreSQL fixtures)', () => {
  let app: INestApplication;
  let runner: QueryRunner;
  let repository: PromotionRepository;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
  });
  beforeEach(async () => {
    runner = app.get(DataSource).createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    for (const table of ['mad_promotion_codes', 'mad_promotion_room_types'])
      await runner.query(
        `CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`,
      );
    repository = new PromotionRepository({
      query: (sql: string, params: unknown[]) => runner.query(sql, params),
    } as unknown as DataSource);
  });
  afterEach(async () => {
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    await runner?.release();
  });
  afterAll(async () => {
    await app?.close();
  });

  async function insert(code: string, type = 'PERCENTAGE', value = 10) {
    const id = randomUUID();
    await runner.query(
      `INSERT INTO pg_temp.mad_promotion_codes
      (promo_id,code_string,discount_type,discount_value,valid_from,valid_until,max_redemptions,current_redemptions,status)
      VALUES ($1,$2,$3,$4,statement_timestamp()-interval '1 day',statement_timestamp()+interval '1 day',2,0,'ACTIVE')`,
      [id, code, type, value],
    );
    return id;
  }

  it('excludes inactive, expired, future and exhausted codes using database time', async () => {
    await insert('VISIBLE');
    await insert('INACTIVE');
    await insert('EXPIRED');
    await insert('FUTURE');
    await insert('EXHAUSTED');
    await runner.query(
      "UPDATE pg_temp.mad_promotion_codes SET status='INACTIVE' WHERE code_string='INACTIVE'",
    );
    await runner.query(
      "UPDATE pg_temp.mad_promotion_codes SET valid_until=statement_timestamp()-interval '1 second' WHERE code_string='EXPIRED'",
    );
    await runner.query(
      "UPDATE pg_temp.mad_promotion_codes SET valid_until=statement_timestamp()+interval '2 days',valid_from=statement_timestamp()+interval '1 day' WHERE code_string='FUTURE'",
    );
    await runner.query(
      "UPDATE pg_temp.mad_promotion_codes SET current_redemptions=max_redemptions WHERE code_string='EXHAUSTED'",
    );
    const result = await repository.findActive(20);
    expect(result.map((row) => row.code)).toEqual(['VISIBLE']);
    expect(result[0]).not.toHaveProperty('current_redemptions');
    expect(result[0]).not.toHaveProperty('max_redemptions');
  });

  it('maps fixed amounts and room scopes, respects limits and never increments redemptions', async () => {
    const id = await insert('FIXED500', 'FIXED_AMOUNT', 50000);
    const rooms = [randomUUID(), randomUUID()].sort();
    for (const room of rooms)
      await runner.query(
        'INSERT INTO pg_temp.mad_promotion_room_types (promo_id,room_type_id) VALUES ($1,$2)',
        [id, room],
      );
    await insert('PERCENT10');
    const result = await repository.findActive(20);
    expect(result.find((row) => row.promoId === id)).toMatchObject({
      discountType: 'FIXED',
      discountValue: 50000,
      currency: 'LKR',
      roomTypeIds: rooms,
    });
    expect(result.find((row) => row.code === 'PERCENT10')?.roomTypeIds).toEqual(
      [],
    );
    expect(await repository.findActive(1)).toHaveLength(1);
    const rows = (await runner.query(
      'SELECT current_redemptions FROM pg_temp.mad_promotion_codes',
    )) as { current_redemptions: number }[];
    expect(rows.every((row) => row.current_redemptions === 0)).toBe(true);
  });
});
