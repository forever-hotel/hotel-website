import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource, QueryRunner } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { Booking } from '../../src/bookings/entities/booking.entity';
import { BookingStatus } from '../../src/bookings/enums/booking-status.enum';
import { BookingSource } from '../../src/bookings/enums/booking-source.enum';
import { Payment } from '../../src/payments/entities/payment.entity';
import { PaymentMethod } from '../../src/payments/enums/payment-method.enum';
import { PaymentStatus } from '../../src/payments/enums/payment-status.enum';
import { RoomType } from '../../src/room-types/entities/room-type.entity';
import { Room } from '../../src/room-types/entities/room.entity';
import { Guest } from '../../src/guests/entities/guest.entity';

describe('Booking/payment infra mappings', () => {
  let app: INestApplication;
  let source: DataSource;
  let runner: QueryRunner;
  let roomTypeId: string;
  let guestId: string;
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;

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
    // Clone the actual infra structure; all writes below are connection-local
    // temporary fixtures. No real guests, bookings or payments are created.
    for (const table of [
      'guests',
      'room_types',
      'rooms',
      'mad_promotion_codes',
      'bookings',
      'payments',
    ]) {
      await runner.query(
        `CREATE TEMP TABLE ${quote(table)} (LIKE public.${quote(table)} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`,
      );
    }
    for (const table of ['rooms', 'bookings', 'payments']) {
      const constraints = (await runner.query(
        "SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=to_regclass($1) AND contype='f'",
        [`public.${table}`],
      )) as { name: string; definition: string }[];
      if (table !== 'rooms') expect(constraints.length).toBeGreaterThan(0);
      for (const constraint of constraints) {
        // Resolve references to the temporary copies, even if pg_get_constraintdef
        // includes an explicit public qualifier in a particular environment.
        const definition = constraint.definition.replace(
          /REFERENCES public\./g,
          'REFERENCES pg_temp.',
        );
        await runner.query(
          `ALTER TABLE pg_temp.${quote(table)} ADD CONSTRAINT ${quote(constraint.name)} ${definition}`,
        );
      }
    }
    // Apply the proposed additions to the temporary copy, never public.bookings.
    await runner.query(
      readFileSync(
        resolve(
          __dirname,
          '../../../documents/api/booking-storage-proposal.sql',
        ),
        'utf8',
      ),
    );
    const type = await runner.manager.getRepository(RoomType).save({
      typeName: `Fixture ${randomUUID()}`,
      pricePerNight: 1000000,
      maxGuests: 2,
    });
    roomTypeId = type.roomTypeId;
    const guest = await runner.manager.getRepository(Guest).save({
      fullName: 'Fixture Guest',
      email: 'fixture@example.invalid',
      passwordHash: 'not-a-real-password-hash',
    });
    guestId = guest.guestId;
    await runner.manager
      .getRepository(Room)
      .save({ roomNumber: 'FIX-101', roomTypeId, floor: 1 });
  });
  afterEach(async () => {
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    await runner?.release();
  });

  const data = () => ({
    guestId,
    roomTypeId,
    roomNumber: 'FIX-101',
    checkInDate: '2026-12-10',
    checkOutDate: '2026-12-12',
    totalAmount: 2000000,
    numGuests: 2,
  });

  it('loads without schema synchronization and round-trips relationships, money, dates and payment references', async () => {
    expect(source.options.synchronize).toBe(false);
    expect(source.getMetadata(Booking).synchronize).toBe(false);
    expect(source.getMetadata(Payment).synchronize).toBe(false);
    const booking = await runner.manager.getRepository(Booking).save(data());
    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(booking.source).toBe(BookingSource.WEBSITE);
    const payment = await runner.manager.getRepository(Payment).save({
      bookingId: booking.bookingId,
      paymentMethod: PaymentMethod.STRIPE,
      amount: 1000000,
      stripeRef: 'pi_fixture_only',
    });
    expect(payment.paymentStatus).toBe(PaymentStatus.PENDING);
    await runner.manager.getRepository(Payment).update(payment.paymentId, {
      paymentStatus: PaymentStatus.COMPLETED,
      paidAt: new Date('2026-12-01T12:00:00Z'),
    });
    const loaded = await runner.manager.getRepository(Booking).findOneOrFail({
      where: { bookingId: booking.bookingId },
      relations: {
        guest: true,
        roomType: true,
        room: true,
        promotion: true,
        payments: true,
      },
    });
    expect(loaded.guest?.guestId).toBe(guestId);
    expect(loaded.roomType.roomTypeId).toBe(roomTypeId);
    expect(loaded.room?.roomNumber).toBe('FIX-101');
    expect(loaded.checkInDate).toBe('2026-12-10');
    expect(loaded.totalAmount).toBe(2000000);
    expect(loaded.promotion).toBeNull();
    expect(loaded.payments[0].stripeRef).toBe('pi_fixture_only');
    expect(loaded.payments[0].paymentStatus).toBe(PaymentStatus.COMPLETED);
    expect(loaded.guest?.passwordHash).toBeUndefined();
  });

  it('supports anonymous walk-ins and unassigned rooms without invented fields', async () => {
    const booking = await runner.manager.getRepository(Booking).save({
      ...data(),
      guestId: null,
      roomNumber: null,
      source: BookingSource.WALK_IN,
    });
    expect(booking.guestId).toBeNull();
    expect(booking.roomNumber).toBeNull();
  });

  it.each([
    { guestId: '00000000-0000-4000-8000-000000000001' },
    { roomTypeId: '00000000-0000-4000-8000-000000000002' },
    { roomNumber: 'MISSING' },
    { promoId: '00000000-0000-4000-8000-000000000003' },
  ])('rejects invalid booking references %j', async (invalid) => {
    await expect(
      runner.manager.getRepository(Booking).save({ ...data(), ...invalid }),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
  });

  it.each([
    { totalAmount: 0 },
    { numGuests: 0 },
    { checkOutDate: '2026-12-09' },
  ])('rejects infra booking checks %j', async (invalid) => {
    await expect(
      runner.manager.getRepository(Booking).save({ ...data(), ...invalid }),
    ).rejects.toMatchObject({ driverError: { code: '23514' } });
  });

  it('rejects invalid booking statuses', async () => {
    await expect(
      runner.manager.query(
        'INSERT INTO pg_temp.bookings (room_type_id, check_in_date, check_out_date, total_amount, status) VALUES ($1, $2, $3, $4, $5)',
        [roomTypeId, '2026-12-10', '2026-12-12', 100, 'INVALID'],
      ),
    ).rejects.toMatchObject({ driverError: { code: '22P02' } });
  });

  it('rejects payments referencing an unknown booking', async () => {
    await expect(
      runner.manager.getRepository(Payment).save({
        bookingId: randomUUID(),
        paymentMethod: PaymentMethod.STRIPE,
        amount: 100,
      }),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
  });

  it('rejects nonpositive payment amounts', async () => {
    const booking = await runner.manager.getRepository(Booking).save(data());
    await expect(
      runner.manager.getRepository(Payment).save({
        bookingId: booking.bookingId,
        paymentMethod: PaymentMethod.STRIPE,
        amount: 0,
      }),
    ).rejects.toMatchObject({ driverError: { code: '23514' } });
  });
});
