import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { GuestBookingsRepository } from '../../src/bookings/guest-bookings.repository';
import { ensureTemporaryCheckoutSchema } from '../support/checkout-fixture';

// All fixture writes and schema adaptations are connection-local and rolled back.
describe('Guest dashboard SQL (temporary PostgreSQL copies)', () => {
  let app: INestApplication;
  let runner: QueryRunner;
  let repository: GuestBookingsRepository;
  let guestId: string;
  let otherGuestId: string;
  let roomTypeId: string;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    runner = app.get(DataSource).createQueryRunner();
    await runner.connect();
    await runner.startTransaction('REPEATABLE READ');
    for (const table of ['room_types', 'room_type_images', 'bookings']) {
      await runner.query(
        `CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`,
      );
    }
    await ensureTemporaryCheckoutSchema(runner);
    guestId = randomUUID();
    otherGuestId = randomUUID();
    roomTypeId = randomUUID();
    await runner.query(
      'INSERT INTO pg_temp.room_types (room_type_id,type_name,price_per_night,max_guests) VALUES ($1,$2,1000000,2)',
      [roomTypeId, 'Fixture Suite'],
    );
    repository = new GuestBookingsRepository({
      query: (sql: string, params?: unknown[]) => runner.query(sql, params),
      transaction: (
        _isolation: string,
        work: (manager: EntityManager) => Promise<unknown>,
      ) => runner.manager.transaction(work),
    } as unknown as DataSource);
  });
  afterEach(async () => {
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    await runner?.release();
  });
  async function add(
    status = 'CONFIRMED',
    checkOut = '2099-12-12',
    expired = false,
    owner = guestId,
  ) {
    const id = randomUUID();
    await runner.query(
      `INSERT INTO pg_temp.bookings (booking_id,guest_id,room_type_id,check_in_date,check_out_date,
        num_guests,total_amount,status,source,currency,checkout_key,hold_expires_at,special_requests,checkout_request_hash,price_snapshot)
       VALUES ($1,$2,$3,'2000-01-01',$4,2,2000000,$5,'WEBSITE','LKR',$6,$7,'Quiet room',$8,$9::jsonb)`,
      [
        id,
        owner,
        roomTypeId,
        checkOut,
        status,
        expired ? id : null,
        expired ? new Date(0) : null,
        expired ? 'a'.repeat(64) : null,
        expired ? JSON.stringify({ quoteId: randomUUID() }) : null,
      ],
    );
    return id;
  }
  it('scopes list and details to the owner and excludes internal data', async () => {
    const owned = await add();
    const foreign = await add('CONFIRMED', '2099-12-12', false, otherGuestId);
    const result = await repository.list(guestId, 'upcoming', 1);
    expect(result.counts).toEqual({
      total: 1,
      upcoming: 1,
      past: 0,
      cancelled: 0,
    });
    expect(result.items.map((item) => item.bookingId)).toEqual([owned]);
    expect(await repository.detail(guestId, foreign)).toBeNull();
    expect(await repository.detail(guestId, randomUUID())).toBeNull();
    const detail = await repository.detail(guestId, owned);
    expect(detail).toMatchObject({
      bookingId: owned,
      roomType: 'Fixture Suite',
      currency: 'LKR',
      specialRequests: 'Quiet room',
    });
    for (const field of [
      'guestId',
      'checkoutKey',
      'checkoutRequestHash',
      'priceSnapshot',
    ])
      expect(detail).not.toHaveProperty(field);
    expect(result.items[0]).not.toHaveProperty('specialRequests');
    expect(
      (await repository.list(randomUUID(), 'upcoming', 1)).counts.total,
    ).toBe(0);
  });
  it('categorizes cancelled, historical, checked-out and expired holds, including hotel checkout-day boundaries', async () => {
    await add();
    await add('CONFIRMED', '2000-01-03');
    await add('CHECKED_OUT');
    await add('CANCELLED');
    const expired = await add('PENDING', '2099-12-12', true);
    const [today] = (await runner.query(
      "SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')::date::text AS date",
    )) as { date: string }[];
    await add('CONFIRMED', today.date);
    const result = await repository.list(guestId, 'upcoming', 1);
    expect(result.counts).toEqual({
      total: 6,
      upcoming: 1,
      past: 4,
      cancelled: 1,
    });
    expect(await repository.detail(guestId, expired)).toMatchObject({
      status: 'PENDING',
      holdExpired: true,
      category: 'past',
    });
    expect((await repository.list(guestId, 'cancelled', 1)).items).toHaveLength(
      1,
    );
  });
  it('paginates deterministically and keeps counts for the entire history', async () => {
    await runner.query(
      `INSERT INTO pg_temp.bookings (guest_id,room_type_id,check_in_date,check_out_date,num_guests,total_amount,status,source,currency)
      SELECT $1,$2,'2099-12-10','2099-12-12',2,2000000,'CONFIRMED','WEBSITE','LKR' FROM generate_series(1,21)`,
      [guestId, roomTypeId],
    );
    const first = await repository.list(guestId, 'upcoming', 1);
    const second = await repository.list(guestId, 'upcoming', 2);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(1);
    expect(second.counts.upcoming).toBe(21);
    expect(
      new Set([...first.items, ...second.items].map((item) => item.bookingId))
        .size,
    ).toBe(21);
    expect((await repository.list(guestId, 'upcoming', 3)).items).toEqual([]);
  });
});
