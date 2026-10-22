import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import type Stripe from 'stripe';
import { AppModule } from '../../src/app.module';
import { PaymentRepository } from '../../src/database/repositories/payment.repository';
import { ensureTemporaryCheckoutSchema } from '../support/checkout-fixture';

describe('Stripe settlement persistence (temporary PostgreSQL copies)', () => {
  let app: INestApplication;
  let runner: QueryRunner;
  let repository: PaymentRepository;
  let bookingId: string;
  let guestId: string;
  let quoteId: string;
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
    for (const table of ['guests', 'room_types', 'bookings', 'payments'])
      await runner.query(
        `CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`,
      );
    await ensureTemporaryCheckoutSchema(runner);
    guestId = randomUUID();
    bookingId = randomUUID();
    quoteId = randomUUID();
    const roomId = randomUUID();
    await runner.query(
      'INSERT INTO pg_temp.guests (guest_id,full_name,email,password_hash) VALUES ($1,$2,$3,$4)',
      [guestId, 'Stripe Fixture', 'stripe@example.invalid', 'fixture-hash'],
    );
    await runner.query(
      'INSERT INTO pg_temp.room_types (room_type_id,type_name,price_per_night,max_guests) VALUES ($1,$2,1000000,2)',
      [roomId, 'Stripe Fixture Room'],
    );
    const snapshot = {
      quoteId,
      nights: 2,
      nightlyRate: 1000000,
      subtotal: 2000000,
      lineItems: [],
      totalAmount: 2000000,
    };
    await runner.query(
      `INSERT INTO pg_temp.bookings (booking_id,guest_id,room_type_id,check_in_date,check_out_date,num_guests,total_amount,status,source,hold_expires_at,checkout_key,checkout_request_hash,price_snapshot,currency)
      VALUES ($1,$2,$3,'2099-12-10','2099-12-12',2,2000000,'PENDING','WEBSITE',clock_timestamp()+interval '20 minutes','fixture-key',$4,$5::jsonb,'LKR')`,
      [bookingId, guestId, roomId, 'a'.repeat(64), JSON.stringify(snapshot)],
    );
    repository = new PaymentRepository({
      transaction: (
        _level: string,
        work: (manager: EntityManager) => Promise<unknown>,
      ) => runner.manager.transaction(work),
      query: (sql: string, params: unknown[]) => runner.query(sql, params),
    } as unknown as DataSource);
  });
  afterEach(async () => {
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    await runner?.release();
  });

  function session(
    paymentId: string,
    amount = 2000000,
    status = 'complete',
    payment_status = 'paid',
  ): Stripe.Checkout.Session {
    return {
      id: 'cs_test_fixture',
      livemode: false,
      mode: 'payment',
      status,
      payment_status,
      amount_total: amount,
      currency: 'lkr',
      client_reference_id: bookingId,
      metadata: { bookingId, paymentId },
      payment_intent: 'pi_fixture',
      url: 'https://checkout.stripe.com/c/pay/fixture',
    } as Stripe.Checkout.Session;
  }
  it('creates one payment/hold, freezes amount and confirms exactly once on replay', async () => {
    const payment = await repository.prepare(
      bookingId,
      guestId,
      'FULL',
      null,
      35,
    );
    const again = await repository.prepare(
      bookingId,
      guestId,
      'FULL',
      null,
      35,
    );
    expect(again).toEqual(payment);
    await expect(
      repository.prepare(bookingId, guestId, 'DEPOSIT', 50, 35),
    ).rejects.toThrow();
    const hold = (await runner.query(
      "SELECT hold_expires_at>clock_timestamp()+interval '34 minutes' AS valid FROM pg_temp.bookings",
    )) as { valid: boolean }[];
    expect(hold[0].valid).toBe(true);
    await repository.attach(bookingId, guestId, session(payment.paymentId));
    await repository.settle(session(payment.paymentId));
    await repository.settle(session(payment.paymentId));
    const current = await repository.status(bookingId, guestId);
    expect(current).toMatchObject({
      status: 'CONFIRMED',
      paidAmount: 2000000,
      balanceAmount: 0,
      paymentState: 'PAID',
    });
    expect(current.priceSnapshot).not.toHaveProperty('payment');
    const rows = (await runner.query(
      'SELECT count(*) AS count FROM pg_temp.payments',
    )) as { count: string }[];
    expect(rows[0].count).toBe('1');
    expect((await repository.recover(guestId, quoteId)).bookingId).toBeNull();
  });
  it('handles an explicitly configured deposit without claiming the unpaid balance is paid', async () => {
    const payment = await repository.prepare(
      bookingId,
      guestId,
      'DEPOSIT',
      30,
      35,
    );
    expect(payment.amount).toBe(600000);
    await repository.settle(session(payment.paymentId, payment.amount));
    expect(await repository.status(bookingId, guestId)).toMatchObject({
      status: 'CONFIRMED',
      paidAmount: 600000,
      balanceAmount: 1400000,
      paymentOption: 'DEPOSIT',
    });
  });
  it('keeps unpaid/open sessions pending and releases an expired provider checkout', async () => {
    const payment = await repository.prepare(
      bookingId,
      guestId,
      'FULL',
      null,
      35,
    );
    await repository.settle(
      session(payment.paymentId, 2000000, 'open', 'unpaid'),
    );
    expect(await repository.status(bookingId, guestId)).toMatchObject({
      status: 'PENDING',
      paidAmount: 0,
    });
    await repository.settle(
      session(payment.paymentId, 2000000, 'expired', 'unpaid'),
    );
    expect(await repository.status(bookingId, guestId)).toMatchObject({
      status: 'CANCELLED',
      paidAmount: 0,
    });
  });
  it('never confirms a late payment after expiry, persists refund recovery and handles duplicate refunds', async () => {
    const payment = await repository.prepare(
      bookingId,
      guestId,
      'FULL',
      null,
      35,
    );
    await runner.query(
      "UPDATE pg_temp.bookings SET hold_expires_at=clock_timestamp()-interval '1 second'",
    );
    const refund = await repository.settle(session(payment.paymentId));
    expect(refund).toMatchObject({
      bookingId,
      paymentId: payment.paymentId,
      intent: 'pi_fixture',
    });
    expect(await repository.status(bookingId, guestId)).toMatchObject({
      status: 'CANCELLED',
      refundStatus: 'PENDING',
      paidAmount: 2000000,
    });
    expect(await repository.settle(session(payment.paymentId))).toEqual(refund);
    await repository.refunded(bookingId, payment.paymentId, false);
    await repository.refunded(bookingId, payment.paymentId, true);
    await repository.refunded(bookingId, payment.paymentId, true);
    expect(await repository.settle(session(payment.paymentId))).toBeNull();
    expect(await repository.status(bookingId, guestId)).toMatchObject({
      status: 'CANCELLED',
      refundStatus: 'REFUNDED',
      paidAmount: 0,
    });
  });
  it('rejects foreign status reads, amount/currency/reference tampering and unapproved deposits', async () => {
    await expect(repository.status(bookingId, randomUUID())).rejects.toThrow();
    await expect(
      repository.prepare(bookingId, guestId, 'DEPOSIT', null, 35),
    ).rejects.toThrow();
    const payment = await repository.prepare(
      bookingId,
      guestId,
      'FULL',
      null,
      35,
    );
    for (const changed of [
      { amount_total: 1 },
      { currency: 'usd' },
      { livemode: true },
      { metadata: { bookingId, paymentId: randomUUID() } },
      { client_reference_id: randomUUID() },
    ])
      await expect(
        repository.settle({ ...session(payment.paymentId), ...changed }),
      ).rejects.toThrow();
    expect(await repository.status(bookingId, guestId)).toMatchObject({
      status: 'PENDING',
      paidAmount: 0,
    });
    expect(await repository.recover(guestId, quoteId)).toEqual({ bookingId });
    expect(await repository.recover(randomUUID(), quoteId)).toEqual({
      bookingId: null,
    });
  });
});
