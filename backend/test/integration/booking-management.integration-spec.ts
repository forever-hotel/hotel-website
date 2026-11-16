import { INestApplication, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { BookingManagementRepository } from '../../src/bookings/booking-management.repository';
import { BookingManagementService } from '../../src/bookings/booking-management.service';
import { BookingChangeEmailService } from '../../src/bookings/booking-change-email.service';
import { PROJECT_MANAGEMENT_POLICY } from '../../src/bookings/management-policy';
import { GuestBookingsRepository } from '../../src/bookings/guest-bookings.repository';
import { BookingRepository } from '../../src/database/repositories/booking.repository';
import { PaymentRepository } from '../../src/database/repositories/payment.repository';
import { ensureTemporaryCheckoutSchema } from '../support/checkout-fixture';

describe('Booking management persistence (connection-local PostgreSQL copies)', () => {
  let app: INestApplication;
  let runner: QueryRunner;
  let source: DataSource;
  let service: BookingManagementService;
  let email: BookingChangeEmailService;
  let id: string;
  let guest: string;
  let room: string;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let values: Record<string, string>;
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
    await runner.startTransaction();
    for (const table of [
      'guests',
      'room_types',
      'room_type_images',
      'rooms',
      'bookings',
      'payments',
    ])
      await runner.query(
        `CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`,
      );
    await ensureTemporaryCheckoutSchema(runner);
    guest = randomUUID();
    room = randomUUID();
    id = randomUUID();
    await runner.query(
      "INSERT INTO pg_temp.guests (guest_id,full_name,email,password_hash) VALUES ($1,'Test guest','fixture@example.invalid','fixture-hash')",
      [guest],
    );
    await runner.query(
      "INSERT INTO pg_temp.room_types (room_type_id,type_name,price_per_night,max_guests) VALUES ($1,'Managed Suite',1000000,2)",
      [room],
    );
    await runner.query(
      "INSERT INTO pg_temp.rooms (room_number,room_type_id,floor,status) VALUES ('MANAGED',$1,1,'VACANT')",
      [room],
    );
    const snapshot = {
      currency: 'LKR',
      nights: 2,
      nightlyRate: 1000000,
      subtotal: 2000000,
      lineItems: [],
      payment: { paymentId: randomUUID(), amount: 2000000, option: 'FULL' },
      confirmationEmail: { state: 'SANDBOX' },
    };
    await runner.query(
      `INSERT INTO pg_temp.bookings (booking_id,guest_id,room_type_id,room_number,check_in_date,check_out_date,num_guests,total_amount,status,source,currency,price_snapshot)
      VALUES ($1,$2,$3,'MANAGED','2099-12-10','2099-12-12',2,2000000,'CONFIRMED','WEBSITE','LKR',$4::jsonb)`,
      [id, guest, room, JSON.stringify(snapshot)],
    );
    await runner.query(
      "INSERT INTO pg_temp.payments (booking_id,payment_method,amount,payment_status) VALUES ($1,'CASH',2000000,'COMPLETED')",
      [id],
    );
    source = {
      query: (sql: string, params?: unknown[]) => runner.query(sql, params),
      transaction: (
        first: string | ((manager: EntityManager) => Promise<unknown>),
        second?: (manager: EntityManager) => Promise<unknown>,
      ) =>
        runner.manager.transaction(
          typeof first === 'function' ? first : second!,
        ),
    } as unknown as DataSource;
    values = {
      NODE_ENV: 'test',
      'jwt.secret': 'integration-management-quote-secret-over-32-chars',
      BOOKING_MANAGEMENT_POLICY: JSON.stringify(PROJECT_MANAGEMENT_POLICY),
      BOOKING_PRICING_POLICY: JSON.stringify({
        version: 'fixture',
        rateBasis: 'INCLUSIVE',
        charges: [],
      }),
      BOOKING_EMAIL_MODE: 'sandbox',
      BREVO_API_KEY: 'fixture',
      BOOKING_EMAIL_FROM: 'hotel@example.com',
    };
    const config = {
      get: (key: string, fallback?: string) => values[key] || fallback,
    } as ConfigService;
    email = new BookingChangeEmailService(source, config);
    service = new BookingManagementService(
      new BookingManagementRepository(source),
      new BookingRepository(source),
      config,
      email,
    );
    fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ messageId: 'fixture-mail' }), {
          status: 201,
        }),
      ),
    );
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    await runner?.release();
  });
  const input = () => ({
    roomTypeId: room,
    checkInDate: '2099-12-12',
    checkOutDate: '2099-12-14',
    numberOfGuests: 2,
  });

  it('excludes the original reservation from inventory, changes dates and keeps dashboard/payment reads consistent', async () => {
    const quote = await service.quote(guest, id, {
      ...input(),
      checkInDate: '2099-12-11',
      checkOutDate: '2099-12-14',
    });
    expect(quote.totalAmount).toBe(3000000);
    const changed = await service.modify(
      guest,
      id,
      quote.quoteToken,
      'integration-change-key',
    );
    expect(changed).toMatchObject({
      status: 'CONFIRMED',
      totalAmount: 3000000,
      balanceAmount: 1000000,
      revision: 1,
      operation: { emailStatus: 'SANDBOX' },
    });
    const dashboard = await new GuestBookingsRepository(source).detail(
      guest,
      id,
    );
    expect(dashboard).toMatchObject({
      checkInDate: '2099-12-11',
      totalAmount: 3000000,
      balanceAmount: 1000000,
      managementRevision: 1,
    });
    const status = await new PaymentRepository(source).status(id, guest);
    expect(status).toMatchObject({
      checkInDate: '2099-12-11',
      totalAmount: 3000000,
      balanceAmount: 1000000,
      paymentState: 'REVIEW_REQUIRED',
    });
    expect(status.priceSnapshot).not.toHaveProperty('management');
    const replay = await service.modify(
      guest,
      id,
      quote.quoteToken,
      'integration-change-key',
    );
    expect(replay.operation.id).toBe(changed.operation.id);
    expect(replay.replayed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('cancels once, releases inventory and records full refund review without refunding payment rows', async () => {
    const result = await service.cancel(guest, id, 0, 'integration-cancel-key');
    expect(result).toMatchObject({
      status: 'CANCELLED',
      refundAmount: 2000000,
      refundStatus: 'PENDING',
      balanceAmount: 0,
    });
    const read = await new PaymentRepository(source).status(id, guest);
    expect(read).toMatchObject({
      status: 'CANCELLED',
      refundStatus: 'PENDING',
      refundAmount: 2000000,
    });
    const inventory = new BookingRepository(source);
    expect(
      await inventory.available(runner.manager, {
        ...input(),
        checkInDate: '2099-12-10',
        checkOutDate: '2099-12-12',
      }),
    ).toBe(1);
    await service.cancel(guest, id, 0, 'integration-cancel-key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [payment] = (await runner.query(
      'SELECT payment_status AS status FROM pg_temp.payments WHERE booking_id=$1',
      [id],
    )) as { status: string }[];
    expect(payment.status).toBe('COMPLETED');
    await expect(
      service.cancel(guest, id, 1, 'second-cancel-key'),
    ).rejects.toThrow();
  });
  it('rejects another guest, unavailable inventory, invalid revision and late changes without modifying the booking', async () => {
    await expect(
      service.cancel(randomUUID(), id, 0, 'foreign-request-key'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.cancel(guest, id, 1, 'stale-request-key'),
    ).rejects.toThrow();
    const quote = await service.quote(guest, id, input());
    await runner.query(
      `INSERT INTO pg_temp.bookings (room_type_id,check_in_date,check_out_date,total_amount,status,source)
      VALUES ($1,'2099-12-12','2099-12-14',2000000,'CONFIRMED','WEBSITE')`,
      [room],
    );
    await expect(
      service.modify(guest, id, quote.quoteToken, 'unavailable-change-key'),
    ).rejects.toThrow();
    const unchanged = await new GuestBookingsRepository(source).detail(
      guest,
      id,
    );
    expect(unchanged).toMatchObject({
      status: 'CONFIRMED',
      checkInDate: '2099-12-10',
      totalAmount: 2000000,
    });
    // Set the cutoff deterministically in the past using today's date instead.
    await runner.query(
      'UPDATE pg_temp.bookings SET check_in_date=CURRENT_DATE,check_out_date=CURRENT_DATE+2 WHERE booking_id=$1',
      [id],
    );
    await expect(
      service.cancel(guest, id, 0, 'late-request-key'),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('email rejection never rolls back cancellation, and accepted/ambiguous sends are not replayed', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 503 }));
    const result = await service.cancel(guest, id, 0, 'email-failure-key');
    expect(result).toMatchObject({
      status: 'CANCELLED',
      operation: { emailStatus: 'UNKNOWN' },
    });
    await service.cancel(guest, id, 0, 'email-failure-key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      (await new GuestBookingsRepository(source).detail(guest, id))?.status,
    ).toBe('CANCELLED');
  });
  it('reflects a staff-reconciled full refund consistently without issuing another refund', async () => {
    await service.cancel(guest, id, 0, 'staff-refund-key');
    await runner.query(
      "UPDATE pg_temp.payments SET payment_status='REFUNDED' WHERE booking_id=$1",
      [id],
    );
    expect(await service.options(guest, id)).toMatchObject({
      status: 'CANCELLED',
      paidAmount: 0,
      refundAmount: 0,
      refundStatus: 'REFUNDED',
    });
    expect(
      await new GuestBookingsRepository(source).detail(guest, id),
    ).toMatchObject({ refundStatus: 'REFUNDED' });
    expect(await new PaymentRepository(source).status(id, guest)).toMatchObject(
      { refundStatus: 'REFUNDED' },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('retries a definite email rejection after cooldown, and never repeats an accepted send', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    const result = await service.cancel(guest, id, 0, 'email-retry-key');
    expect(result.operation.emailStatus).toBe('FAILED');
    await service.cancel(guest, id, 0, 'email-retry-key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await runner.query(
      `UPDATE pg_temp.bookings SET price_snapshot=jsonb_set(price_snapshot,
      '{management,events,0,email,attemptedAt}',to_jsonb((clock_timestamp()-interval '2 minutes')::text)) WHERE booking_id=$1`,
      [id],
    );
    const retried = await service.cancel(guest, id, 0, 'email-retry-key');
    expect(retried.operation.emailStatus).toBe('SANDBOX');
    await service.cancel(guest, id, 0, 'email-retry-key');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
