import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { PayHereRepository } from '../../src/payments/payhere.repository';
import { ConfirmationEmailRepository } from '../../src/payments/confirmation-email.repository';
import { ConfirmationEmailService } from '../../src/payments/confirmation-email.service';
import { ensureTemporaryCheckoutSchema } from '../support/checkout-fixture';

const brevoAccepted = () =>
  Promise.resolve(
    new Response(JSON.stringify({ messageId: 'fixture' }), { status: 201 }),
  );

describe('PayHere settlement and Brevo receipt (isolated PostgreSQL copies)', () => {
  let app: INestApplication;
  let runner: QueryRunner;
  let repository: PayHereRepository;
  let source: DataSource;
  let id: string;
  let guestId: string;
  const billing = {
    firstName: 'Test',
    lastName: 'Guest',
    phone: '+94771234567',
    address: 'Test street',
    city: 'Colombo',
    country: 'Sri Lanka',
  };
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
    // Exercise the migration using a connection-local enum, never alter public types.
    await runner.query(
      "CREATE TYPE pg_temp.payment_method AS ENUM ('STRIPE','CASH','CARD_ON_SITE','PAYHERE')",
    );
    await runner.query(
      'ALTER TABLE pg_temp.payments ALTER COLUMN payment_method TYPE pg_temp.payment_method USING payment_method::text::pg_temp.payment_method',
    );
    guestId = randomUUID();
    id = randomUUID();
    const roomId = randomUUID();
    await runner.query(
      'INSERT INTO guests (guest_id,full_name,email,password_hash) VALUES ($1,$2,$3,$4)',
      [guestId, 'Test Guest', 'guest@example.com', 'fixture-hash'],
    );
    await runner.query(
      'INSERT INTO room_types (room_type_id,type_name,price_per_night,max_guests) VALUES ($1,$2,1000000,2)',
      [roomId, 'Test Suite'],
    );
    await runner.query(
      `INSERT INTO bookings (booking_id,guest_id,room_type_id,check_in_date,check_out_date,num_guests,total_amount,status,source,hold_expires_at,checkout_key,checkout_request_hash,price_snapshot,currency)
      VALUES ($1,$2,$3,'2099-12-10','2099-12-12',2,2000000,'PENDING','WEBSITE',clock_timestamp()+interval '20 minutes','fixture-key',$4,$5::jsonb,'LKR')`,
      [
        id,
        guestId,
        roomId,
        'a'.repeat(64),
        JSON.stringify({
          quoteId: randomUUID(),
          nights: 2,
          nightlyRate: 1000000,
          subtotal: 2000000,
          lineItems: [],
          totalAmount: 2000000,
        }),
      ],
    );
    source = {
      query: (sql: string, params?: unknown[]) => runner.query(sql, params),
      transaction: (
        _level: string,
        work: (manager: EntityManager) => Promise<unknown>,
      ) => runner.manager.transaction(work),
    } as unknown as DataSource;
    repository = new PayHereRepository(source);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    await runner?.release();
  });
  const received = (orderId: string, paymentId = '12345') => ({
    orderId,
    paymentId,
    amount: 2000000,
    status: 'RECEIVED',
  });

  it('prepares one full-payment order without extending retries or leaking billing to status', async () => {
    expect(await repository.supported()).toBe(true);
    const first = await repository.prepareCheckout(
      id,
      guestId,
      'sandbox',
      billing,
    );
    expect(
      await repository.prepareCheckout(id, guestId, 'sandbox', billing),
    ).toEqual(first);
    expect((await repository.metadata(id, guestId))?.billing).toEqual(billing);
    expect(
      await source.query(
        'SELECT payment_method, count(*)::int AS count FROM payments GROUP BY payment_method',
      ),
    ).toEqual([{ payment_method: 'PAYHERE', count: 1 }]);
    expect(
      (await repository.status(id, guestId)).priceSnapshot,
    ).not.toHaveProperty('payment');
    expect(await repository.locate(first.paymentId)).toEqual({
      bookingId: id,
      environment: 'sandbox',
    });
    await expect(repository.locate(randomUUID())).rejects.toThrow();
    await expect(repository.metadata(id, randomUUID())).rejects.toThrow();
    await expect(
      repository.prepareCheckout(id, guestId, 'live', billing),
    ).rejects.toThrow();
  });
  it('settles repeated callbacks once and sends one Brevo sandbox receipt consistent with status', async () => {
    const payment = await repository.prepareCheckout(
      id,
      guestId,
      'sandbox',
      billing,
    );
    const email = new ConfirmationEmailService(
      new ConfirmationEmailRepository(source),
      {
        get: (key: string) =>
          ({
            BOOKING_EMAIL_MODE: 'sandbox',
            BREVO_API_KEY: 'fixture',
            CONTACT_EMAIL_FROM: 'hotel@example.com',
            NODE_ENV: 'test',
          })[key],
      } as ConfigService,
    );
    const send = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(brevoAccepted);
    await email.send(id);
    expect(send).not.toHaveBeenCalled();
    await repository.settleReceipts(id, payment.paymentId, 'sandbox', [
      received(payment.paymentId),
    ]);
    await email.send(id);
    await repository.settleReceipts(id, payment.paymentId, 'sandbox', [
      received(payment.paymentId),
    ]);
    await email.send(id);
    expect(send).toHaveBeenCalledTimes(1);
    const status = await repository.status(id, guestId);
    expect(status).toMatchObject({
      status: 'CONFIRMED',
      paidAmount: 2000000,
      balanceAmount: 0,
      emailStatus: 'SANDBOX',
      paymentReference: '12345',
    });
    const body = JSON.parse(send.mock.calls[0][1]?.body as string) as {
      textContent: string;
    };
    for (const value of [
      id,
      status.roomType,
      status.checkInDate,
      status.checkOutDate,
      'Paid: LKR 20000.00',
      'Balance: LKR 0.00',
    ])
      expect(body.textContent).toContain(value);
    expect(
      await source.query('SELECT count(*)::int AS count FROM payments'),
    ).toEqual([{ count: 1 }]);
  });
  it('records a second real payment separately and flags refund review without duplicate rows on replay', async () => {
    const payment = await repository.prepareCheckout(
      id,
      guestId,
      'sandbox',
      billing,
    );
    const receipts = [
      received(payment.paymentId),
      received(payment.paymentId, '67890'),
    ];
    const result = await repository.settleReceipts(
      id,
      payment.paymentId,
      'sandbox',
      receipts,
    );
    expect(result.reviewRequired).toBe(true);
    await repository.settleReceipts(id, payment.paymentId, 'sandbox', receipts);
    expect(await repository.status(id, guestId)).toMatchObject({
      paidAmount: 4000000,
      refundStatus: 'PENDING',
    });
    expect(
      await source.query('SELECT count(*)::int AS count FROM payments'),
    ).toEqual([{ count: 2 }]);
    expect(await new ConfirmationEmailRepository(source).claim(id)).toBeNull();
  });
  it.each(['expired', 'cancelled'])(
    'never reclaims inventory for a paid %s checkout',
    async (mode) => {
      const payment = await repository.prepareCheckout(
        id,
        guestId,
        'sandbox',
        billing,
      );
      if (mode === 'cancelled') await repository.cancelCheckout(id, guestId);
      else
        await source.query(
          "UPDATE bookings SET hold_expires_at=clock_timestamp()-interval '1 minute' WHERE booking_id=$1",
          [id],
        );
      await repository.settleReceipts(id, payment.paymentId, 'sandbox', [
        received(payment.paymentId),
      ]);
      expect(await repository.status(id, guestId)).toMatchObject({
        status: 'CANCELLED',
        paidAmount: 2000000,
        refundStatus: 'PENDING',
      });
      expect(
        await new ConfirmationEmailRepository(source).claim(id),
      ).toBeNull();
    },
  );
  it('tracks refunds and chargebacks and never reverses them on stale received data', async () => {
    const payment = await repository.prepareCheckout(
      id,
      guestId,
      'sandbox',
      billing,
    );
    await repository.settleReceipts(id, payment.paymentId, 'sandbox', [
      received(payment.paymentId),
    ]);
    await expect(repository.cancelCheckout(id, guestId)).rejects.toThrow();
    for (const status of ['REFUND REQUESTED', 'REFUND PROCESSING', 'REFUNDED'])
      await repository.settleReceipts(id, payment.paymentId, 'sandbox', [
        { ...received(payment.paymentId), status },
      ]);
    await repository.settleReceipts(id, payment.paymentId, 'sandbox', [
      received(payment.paymentId),
    ]);
    expect(await repository.status(id, guestId)).toMatchObject({
      paidAmount: 0,
      refundStatus: 'REFUNDED',
    });
    await repository.settleReceipts(id, payment.paymentId, 'sandbox', [
      { ...received(payment.paymentId), status: 'CHARGEBACKED' },
    ]);
    expect((await repository.metadata(id, guestId))?.reviewRequired).toBe(true);
  });
  it('rejects tampered amount, order and environment without recording payment', async () => {
    const payment = await repository.prepareCheckout(
      id,
      guestId,
      'sandbox',
      billing,
    );
    await expect(
      repository.settleReceipts(id, randomUUID(), 'sandbox', []),
    ).rejects.toThrow();
    await expect(
      repository.settleReceipts(id, payment.paymentId, 'live', []),
    ).rejects.toThrow();
    await expect(
      repository.settleReceipts(id, payment.paymentId, 'sandbox', [
        { ...received(payment.paymentId), amount: 1 },
      ]),
    ).rejects.toThrow();
    expect(await repository.status(id, guestId)).toMatchObject({
      status: 'PENDING',
      paidAmount: 0,
    });
  });
  it('requires initial billing and rejects expired or foreign holds', async () => {
    await expect(
      repository.prepareCheckout(id, guestId, 'sandbox'),
    ).rejects.toThrow();
    await expect(
      repository.prepareCheckout(id, randomUUID(), 'sandbox', billing),
    ).rejects.toThrow();
    await source.query(
      "UPDATE bookings SET hold_expires_at=clock_timestamp()-interval '1 minute' WHERE booking_id=$1",
      [id],
    );
    await expect(
      repository.prepareCheckout(id, guestId, 'sandbox', billing),
    ).rejects.toThrow();
  });
});
