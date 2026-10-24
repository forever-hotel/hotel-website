import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { BookingRepository } from '../../src/database/repositories/booking.repository';
import { BookingsService } from '../../src/bookings/bookings.service';
import { PaymentRepository } from '../../src/database/repositories/payment.repository';
import type Stripe from 'stripe';
import { ConfirmationEmailRepository } from '../../src/payments/confirmation-email.repository';
import { PayHereRepository } from '../../src/payments/payhere.repository';

// Explicitly enabled only for the disposable localhost PostgreSQL CI service.
const raceTests =
  process.env.BOOKING_RACE_TEST === 'true' ? describe : describe.skip;
raceTests(
  'Concurrent reservation transactions (disposable database only)',
  () => {
    let admin: DataSource;
    let source: DataSource;
    let service: BookingsService;
    const schema = `booking_race_${randomUUID().replaceAll('-', '')}`;
    let guestId: string;
    let roomTypeId: string;
    beforeAll(async () => {
      if (
        !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || '') ||
        process.env.CI !== 'true'
      )
        throw new Error(
          'Race tests require the disposable localhost CI database',
        );
      const options = {
        type: 'postgres' as const,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        synchronize: false,
        connectTimeoutMS: 10000,
      };
      admin = await new DataSource(options).initialize();
      await admin.query(`CREATE SCHEMA "${schema}"`);
      source = await new DataSource({
        ...options,
        extra: { options: `-c search_path=${schema},public`, max: 5 },
      }).initialize();
      for (const table of [
        'guests',
        'room_types',
        'rooms',
        'bookings',
        'payments',
      ])
        await source.query(
          `CREATE TABLE "${schema}".${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)`,
        );
      await source.query(
        readFileSync(
          resolve(
            __dirname,
            '../../../documents/api/booking-storage-proposal.sql',
          ),
          'utf8',
        ),
      );
      await source.query(
        `CREATE TYPE "${schema}".payment_method AS ENUM ('STRIPE','CASH','CARD_ON_SITE','PAYHERE')`,
      );
      await source.query(
        `ALTER TABLE "${schema}".payments ALTER COLUMN payment_method TYPE "${schema}".payment_method USING payment_method::text::"${schema}".payment_method`,
      );
      service = new BookingsService(new BookingRepository(source), {
        get: () =>
          JSON.stringify({
            version: 'ci-fixture-only',
            rateBasis: 'INCLUSIVE',
            charges: [],
          }),
      } as unknown as ConfigService);
    });
    afterAll(async () => {
      if (source?.isInitialized) await source.destroy();
      if (admin?.isInitialized) {
        // The generated schema name is fixed above and cannot name public.
        await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
        await admin.destroy();
      }
    });
    beforeEach(async () => {
      await source.query(
        `TRUNCATE ${['payments', 'bookings', 'rooms', 'room_types', 'guests'].map((table) => `"${schema}".${table}`).join(',')}`,
      );
      guestId = randomUUID();
      roomTypeId = randomUUID();
      await source.query(
        'INSERT INTO guests (guest_id,full_name,email,password_hash) VALUES ($1,$2,$3,$4)',
        [
          guestId,
          'CI Fixture Guest',
          `${guestId}@example.invalid`,
          'fixture-hash',
        ],
      );
      await source.query(
        'INSERT INTO room_types (room_type_id,type_name,price_per_night,max_guests) VALUES ($1,$2,1000000,2)',
        [roomTypeId, 'CI Fixture Suite'],
      );
      await source.query(
        "INSERT INTO rooms (room_number,room_type_id,floor,status) VALUES ('CI-ONLY',$1,1,'VACANT')",
        [roomTypeId],
      );
    });
    const quoteInput = () => ({
      roomTypeId,
      checkInDate: '2099-12-10',
      checkOutDate: '2099-12-12',
      numberOfGuests: 2,
    });
    it('allows only one last-room reservation across simultaneous transactions', async () => {
      const quotes = await Promise.all([
        service.createQuote(guestId, quoteInput()),
        service.createQuote(guestId, quoteInput()),
      ]);
      const results = await Promise.allSettled(
        quotes.map((quote, index) =>
          service.createReservation(
            guestId,
            { quoteToken: quote.quoteToken },
            `ci-attempt-${index}`,
          ),
        ),
      );
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const failed = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );
      expect(failed?.reason as unknown).toMatchObject({
        response: { error: 'ROOM_UNAVAILABLE' },
      });
      expect(
        await source.query('SELECT count(*)::int AS count FROM bookings'),
      ).toEqual([{ count: 1 }]);
    });
    it('returns one persistent booking for simultaneous duplicate submissions', async () => {
      const quote = await service.createQuote(guestId, quoteInput());
      const responses = await Promise.all([
        service.createReservation(
          guestId,
          { quoteToken: quote.quoteToken },
          'ci-same-attempt',
        ),
        service.createReservation(
          guestId,
          { quoteToken: quote.quoteToken },
          'ci-same-attempt',
        ),
      ]);
      expect(responses[0]).toEqual(responses[1]);
      expect(
        await source.query('SELECT count(*)::int AS count FROM bookings'),
      ).toEqual([{ count: 1 }]);
    });
    it('prepares and confirms exactly one payment under simultaneous retries', async () => {
      const quote = await service.createQuote(guestId, quoteInput());
      const booking = await service.createReservation(
        guestId,
        { quoteToken: quote.quoteToken },
        'ci-stripe-attempt',
      );
      const payments = new PaymentRepository(source);
      const prepared = await Promise.all([
        payments.prepare(booking.bookingId, guestId, 'FULL', null, 35),
        payments.prepare(booking.bookingId, guestId, 'FULL', null, 35),
      ]);
      expect(prepared[0]).toEqual(prepared[1]);
      const session = {
        id: 'cs_test_ci_fixture',
        livemode: false,
        mode: 'payment',
        status: 'complete',
        payment_status: 'paid',
        amount_total: 2000000,
        currency: 'lkr',
        client_reference_id: booking.bookingId,
        metadata: {
          bookingId: booking.bookingId,
          paymentId: prepared[0].paymentId,
        },
        payment_intent: 'pi_ci_fixture',
        url: null,
      } as Stripe.Checkout.Session;
      await Promise.all([payments.settle(session), payments.settle(session)]);
      expect(
        await source.query('SELECT count(*)::int AS count FROM payments'),
      ).toEqual([{ count: 1 }]);
      expect(await payments.status(booking.bookingId, guestId)).toMatchObject({
        status: 'CONFIRMED',
        paidAmount: 2000000,
        balanceAmount: 0,
      });
      const mail = new ConfirmationEmailRepository(source);
      const claims = await Promise.all([
        mail.claim(booking.bookingId),
        mail.claim(booking.bookingId),
        mail.claim(booking.bookingId),
      ]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      await mail.finish(booking.bookingId, 'ACCEPTED');
      expect(await mail.claim(booking.bookingId)).toBeNull();
    });
    it('creates and settles one PayHere payment across concurrent requests and claims one receipt', async () => {
      const quote = await service.createQuote(guestId, quoteInput());
      const booking = await service.createReservation(
        guestId,
        { quoteToken: quote.quoteToken },
        'ci-payhere-attempt',
      );
      const payments = new PayHereRepository(source);
      const billing = {
        firstName: 'Test',
        lastName: 'Guest',
        phone: '0771234567',
        address: 'Test street',
        city: 'Colombo',
        country: 'Sri Lanka',
      };
      const prepared = await Promise.all([
        payments.prepareCheckout(
          booking.bookingId,
          guestId,
          'sandbox',
          billing,
        ),
        payments.prepareCheckout(
          booking.bookingId,
          guestId,
          'sandbox',
          billing,
        ),
      ]);
      expect(prepared[0]).toEqual(prepared[1]);
      const receipt = {
        orderId: prepared[0].paymentId,
        paymentId: '12345',
        amount: 2000000,
        status: 'RECEIVED',
      };
      await Promise.all([
        payments.settleReceipts(booking.bookingId, receipt.orderId, 'sandbox', [
          receipt,
        ]),
        payments.settleReceipts(booking.bookingId, receipt.orderId, 'sandbox', [
          receipt,
        ]),
      ]);
      expect(
        await source.query('SELECT count(*)::int AS count FROM payments'),
      ).toEqual([{ count: 1 }]);
      expect(await payments.status(booking.bookingId, guestId)).toMatchObject({
        status: 'CONFIRMED',
        paidAmount: 2000000,
      });
      const email = new ConfirmationEmailRepository(source);
      expect(
        (
          await Promise.all([
            email.claim(booking.bookingId),
            email.claim(booking.bookingId),
          ])
        ).filter(Boolean),
      ).toHaveLength(1);
    });
  },
);
