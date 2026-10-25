import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { BookingRepository } from '../../src/database/repositories/booking.repository';
import { BookingsService } from '../../src/bookings/bookings.service';

describe('Reservation persistence (temporary PostgreSQL fixtures)', () => {
  let app: INestApplication;
  let source: DataSource;
  let runner: QueryRunner;
  let service: BookingsService;
  let guestId: string;
  let roomTypeId: string;
  const input = () => ({
    roomTypeId,
    checkInDate: '2099-12-10',
    checkOutDate: '2099-12-12',
    numberOfGuests: 2,
  });
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
  beforeEach(async () => {
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    for (const table of ['guests', 'room_types', 'rooms', 'bookings'])
      await runner.query(
        `CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`,
      );
    const proposal = readFileSync(
      resolve(__dirname, '../../../documents/api/booking-storage-proposal.sql'),
      'utf8',
    ).replaceAll('CREATE TABLE ', 'CREATE TEMP TABLE ');
    await runner.query(proposal);
    guestId = randomUUID();
    roomTypeId = randomUUID();
    await runner.query(
      'INSERT INTO pg_temp.guests (guest_id,full_name,email,password_hash) VALUES ($1,$2,$3,$4)',
      [guestId, 'Fixture Guest', 'fixture@example.invalid', 'fixture-hash'],
    );
    await runner.query(
      'INSERT INTO pg_temp.room_types (room_type_id,type_name,price_per_night,max_guests) VALUES ($1,$2,$3,$4)',
      [roomTypeId, 'Fixture Suite', 1000000, 2],
    );
    await runner.query(
      "INSERT INTO pg_temp.rooms (room_number,room_type_id,floor,status) VALUES ('FIXTURE', $1, 1, 'VACANT')",
      [roomTypeId],
    );
    const repository = new BookingRepository({
      transaction: (
        _level: string,
        work: (manager: EntityManager) => Promise<unknown>,
      ) => runner.manager.transaction(work),
    } as unknown as DataSource);
    service = new BookingsService(repository, {
      get: () =>
        JSON.stringify({
          version: 'fixture-only',
          rateBasis: 'INCLUSIVE',
          charges: [],
        }),
    } as unknown as ConfigService);
  });
  afterEach(async () => {
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    await runner?.release();
  });

  it('does not hold rooms on quoting and replays the persisted reservation identity', async () => {
    const first = await service.createQuote(guestId, input());
    const second = await service.createQuote(guestId, input());
    expect(
      await runner.query('SELECT count(*)::int AS count FROM pg_temp.bookings'),
    ).toEqual([{ count: 0 }]);
    const response = await service.createReservation(
      guestId,
      { quoteToken: first.quoteToken },
      'fixture-attempt-1',
    );
    const replay = await service.createReservation(
      guestId,
      { quoteToken: first.quoteToken },
      'fixture-attempt-1',
    );
    expect(replay).toEqual(response);
    await expect(
      service.createReservation(
        guestId,
        { quoteToken: second.quoteToken },
        'fixture-attempt-2',
      ),
    ).rejects.toMatchObject({ response: { error: 'ROOM_UNAVAILABLE' } });
    expect(
      await runner.query('SELECT count(*)::int AS count FROM pg_temp.bookings'),
    ).toEqual([{ count: 1 }]);
  });
  it('rejects cross-guest quotes and changed requests while preserving the original price', async () => {
    const quote = await service.createQuote(guestId, input());
    await expect(
      service.createReservation(
        randomUUID(),
        { quoteToken: quote.quoteToken },
        'fixture-other-guest',
      ),
    ).rejects.toMatchObject({ response: { error: 'QUOTE_NOT_FOUND' } });
    await runner.query('UPDATE pg_temp.room_types SET price_per_night=1100000');
    const frozen = await service.createReservation(
      guestId,
      { quoteToken: quote.quoteToken },
      'fixture-attempt-1',
    );
    expect(frozen.totalAmount).toBe(2000000);
    await expect(
      service.createReservation(
        guestId,
        { quoteToken: quote.quoteToken, specialRequests: 'Different request' },
        'fixture-attempt-1',
      ),
    ).rejects.toMatchObject({ response: { error: 'IDEMPOTENCY_CONFLICT' } });
  });
  it('expires only website holds and permits a fresh reservation after expiry', async () => {
    const first = await service.createQuote(guestId, input());
    const second = await service.createQuote(guestId, input());
    await service.createReservation(
      guestId,
      { quoteToken: first.quoteToken },
      'fixture-attempt-1',
    );
    await runner.query(
      "UPDATE pg_temp.bookings SET hold_expires_at=clock_timestamp()-interval '1 second'",
    );
    await expect(
      service.createReservation(
        guestId,
        { quoteToken: first.quoteToken },
        'fixture-attempt-1',
      ),
    ).rejects.toMatchObject({ response: { error: 'HOLD_EXPIRED' } });
    await service.createReservation(
      guestId,
      { quoteToken: second.quoteToken },
      'fixture-attempt-2',
    );
    expect(
      await runner.query(
        'SELECT status,count(*)::int AS count FROM pg_temp.bookings GROUP BY status ORDER BY status::text',
      ),
    ).toEqual([
      { status: 'CANCELLED', count: 1 },
      { status: 'PENDING', count: 1 },
    ]);
  });
});
