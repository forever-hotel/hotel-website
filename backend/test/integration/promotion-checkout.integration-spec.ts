import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { BookingsService } from '../../src/bookings/bookings.service';
import { BookingRepository } from '../../src/database/repositories/booking.repository';
import { PayHereRepository } from '../../src/payments/payhere.repository';

// Explicit disposable database only. Never fall back to the developer's .env.
const target = process.env.HW_PROMOTION_TEST_DATABASE_URL;
if (target) {
  const url = new URL(target);
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.pathname !== '/hw_promotion_review'
  )
    throw new Error(
      'Promotion integration tests require the designated loopback disposable database.',
    );
}

(target ? describe : describe.skip)(
  'Promotion checkout on disposable shared PostgreSQL',
  () => {
    const source = new DataSource({
      type: 'postgres',
      url: target,
      synchronize: false,
      migrationsRun: false,
    });
    const bookings = new BookingsService(
      new BookingRepository(source),
      new ConfigService({
        jwt: {
          secret: 'promotion-checkout-disposable-fixture-secret-32-chars',
        },
        BOOKING_PRICING_POLICY: JSON.stringify({
          version: 'fixture',
          rateBasis: 'INCLUSIVE',
          charges: [],
        }),
      }),
    );
    const payments = new PayHereRepository(source);
    let guestId: string;
    let roomTypeId: string;
    let promoId: string;
    let code: string;
    const billing = {
      firstName: 'Fixture',
      lastName: 'Guest',
      phone: '0771234567',
      address: 'Test road',
      city: 'Colombo',
      country: 'Sri Lanka',
    };
    beforeAll(async () => {
      await source.initialize();
    });
    afterAll(async () => {
      if (source.isInitialized) await source.destroy();
    });
    async function roomType() {
      const id = randomUUID();
      await source.query(
        "INSERT INTO room_types(room_type_id,type_name,description,price_per_night,max_guests) VALUES($1,$2,'Fixture',100000,2)",
        [id, id],
      );
      for (let i = 0; i < 3; i++)
        await source.query(
          "INSERT INTO rooms(room_number,room_type_id,floor,status) VALUES($1,$2,1,'VACANT')",
          [`${id.slice(0, 7)}${i}`, id],
        );
      return id;
    }
    beforeEach(async () => {
      guestId = randomUUID();
      promoId = randomUUID();
      code = `TEST_${promoId.replaceAll('-', '').toUpperCase()}`;
      await source.query(
        "INSERT INTO guests(guest_id,full_name,email,password_hash) VALUES($1,'Fixture Guest',$2,'not-used-for-login')",
        [guestId, `${guestId}@example.invalid`],
      );
      roomTypeId = await roomType();
      await source.query(
        "INSERT INTO mad_promotion_codes(promo_id,code_string,discount_type,discount_value,valid_from,valid_until,max_redemptions,current_redemptions,status) VALUES($1,$2,'PERCENTAGE',10,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',1,0,'ACTIVE')",
        [promoId, code],
      );
    });
    async function quote(typeId = roomTypeId) {
      return bookings.createQuote(guestId, {
        roomTypeId: typeId,
        checkInDate: '2099-12-10',
        checkOutDate: '2099-12-12',
        numberOfGuests: 2,
        promoCode: code,
      });
    }
    async function reserve(
      preview: Awaited<ReturnType<typeof quote>>,
      key = randomUUID(),
    ) {
      return bookings.createReservation(
        guestId,
        { quoteToken: preview.quoteToken },
        key,
      );
    }
    async function uses() {
      return (
        await source.query<{ current_redemptions: number }[]>(
          'SELECT current_redemptions FROM mad_promotion_codes WHERE promo_id=$1',
          [promoId],
        )
      )[0].current_redemptions;
    }
    it('freezes discounted payment amounts and redeems exactly once across duplicate receipts', async () => {
      const preview = await quote();
      expect(preview).toMatchObject({
        subtotal: 200000,
        discountAmount: 20000,
        totalAmount: 180000,
      });
      const booking = await reserve(preview);
      expect(await uses()).toBe(0);
      const payment = await payments.prepareCheckout(
        booking.bookingId,
        guestId,
        'sandbox',
        billing,
      );
      expect(payment.amount).toBe(180000);
      const receipts = [
        {
          paymentId: 'receipt-one',
          orderId: payment.paymentId,
          amount: payment.amount,
          status: 'RECEIVED',
        },
      ];
      await payments.settleReceipts(
        booking.bookingId,
        payment.paymentId,
        'sandbox',
        receipts,
      );
      await payments.settleReceipts(
        booking.bookingId,
        payment.paymentId,
        'sandbox',
        receipts,
      );
      expect(await uses()).toBe(1);
      expect((await payments.status(booking.bookingId, guestId)).status).toBe(
        'CONFIRMED',
      );
      const replay = await bookings.createReservation(
        guestId,
        { quoteToken: preview.quoteToken },
        (
          await source.query<{ checkout_key: string }[]>(
            'SELECT checkout_key FROM bookings WHERE booking_id=$1',
            [booking.bookingId],
          )
        )[0].checkout_key,
      );
      expect(replay.bookingId).toBe(booking.bookingId);
      expect(await uses()).toBe(1);
    });
    it('serializes the last available use across different room inventory locks', async () => {
      const [first, second] = await Promise.all([
        quote(),
        roomType().then((id) => quote(id)),
      ]);
      const results = await Promise.allSettled([
        reserve(first),
        reserve(second),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      expect(await uses()).toBe(0);
    });
    it('releases expired holds and flags late received money for review without consuming a use', async () => {
      const first = await reserve(await quote());
      const payment = await payments.prepareCheckout(
        first.bookingId,
        guestId,
        'sandbox',
        billing,
      );
      await source.query(
        "UPDATE bookings SET hold_expires_at=clock_timestamp()-interval '1 minute' WHERE booking_id=$1",
        [first.bookingId],
      );
      const replacement = await reserve(await quote());
      expect(replacement.bookingId).not.toBe(first.bookingId);
      const late = await payments.settleReceipts(
        first.bookingId,
        payment.paymentId,
        'sandbox',
        [
          {
            paymentId: 'late-receipt',
            orderId: payment.paymentId,
            amount: payment.amount,
            status: 'RECEIVED',
          },
        ],
      );
      expect(late.reviewRequired).toBe(true);
      expect(await uses()).toBe(0);
      expect((await payments.status(first.bookingId, guestId)).status).toBe(
        'CANCELLED',
      );
    });
    it('releases cancellation holds without counting a redemption', async () => {
      const first = await reserve(await quote());
      await payments.cancelCheckout(first.bookingId, guestId);
      expect((await reserve(await quote())).bookingId).not.toBe(
        first.bookingId,
      );
      expect(await uses()).toBe(0);
    });
    it('rejects changed terms, wrong rooms, inactive, expired and fully discounted codes', async () => {
      const preview = await quote();
      await source.query(
        'UPDATE mad_promotion_codes SET discount_value=20,version=version+1 WHERE promo_id=$1',
        [promoId],
      );
      await expect(reserve(preview)).rejects.toMatchObject({
        response: { error: 'PROMOTION_CHANGED' },
      });
      await source.query(
        'INSERT INTO mad_promotion_room_types(promo_id,room_type_id) VALUES($1,$2)',
        [promoId, await roomType()],
      );
      await expect(quote()).rejects.toMatchObject({
        response: { error: 'PROMOTION_UNAVAILABLE' },
      });
      await source.query(
        'DELETE FROM mad_promotion_room_types WHERE promo_id=$1',
        [promoId],
      );
      await source.query(
        "UPDATE mad_promotion_codes SET status='INACTIVE' WHERE promo_id=$1",
        [promoId],
      );
      await expect(quote()).rejects.toThrow();
      await source.query(
        "UPDATE mad_promotion_codes SET status='ACTIVE',valid_until=clock_timestamp()-interval '1 minute' WHERE promo_id=$1",
        [promoId],
      );
      await expect(quote()).rejects.toThrow();
      await source.query(
        "UPDATE mad_promotion_codes SET valid_until=clock_timestamp()+interval '1 day',discount_value=100 WHERE promo_id=$1",
        [promoId],
      );
      await expect(quote()).rejects.toMatchObject({
        response: { error: 'PROMOTION_NOT_PAYABLE' },
      });
    });
    it('checks validity after waiting for an unchanged promotion row lock', async () => {
      await source.query(
        "UPDATE mad_promotion_codes SET valid_until=clock_timestamp()+interval '3 seconds' WHERE promo_id=$1",
        [promoId],
      );
      const locker = source.createQueryRunner();
      await locker.connect();
      await locker.startTransaction();
      try {
        await locker.query(
          'SELECT promo_id FROM mad_promotion_codes WHERE promo_id=$1 FOR UPDATE',
          [promoId],
        );
        const attempt = quote().then(
          (value) => ({ value, error: undefined }),
          (error: unknown) => ({ value: undefined, error }),
        );
        await source.query('SELECT pg_sleep(0.25)');
        const waiting = await source.query<{ blocked: boolean }[]>(
          "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT promo_id AS%') AS blocked",
        );
        expect(waiting[0].blocked).toBe(true);
        await source.query('SELECT pg_sleep(3.1)');
        await locker.commitTransaction();
        expect((await attempt).error).toMatchObject({
          response: { error: 'PROMOTION_UNAVAILABLE' },
        });
      } finally {
        if (locker.isTransactionActive) await locker.rollbackTransaction();
        await locker.release();
      }
    });

    it('honors already-held terms after deactivation and supports fixed-cent discounts', async () => {
      await source.query(
        "UPDATE mad_promotion_codes SET discount_type='FIXED_AMOUNT',discount_value=25000 WHERE promo_id=$1",
        [promoId],
      );
      const preview = await quote();
      expect(preview.totalAmount).toBe(175000);
      const booking = await reserve(preview);
      await source.query(
        "UPDATE mad_promotion_codes SET status='INACTIVE',version=version+1 WHERE promo_id=$1",
        [promoId],
      );
      const payment = await payments.prepareCheckout(
        booking.bookingId,
        guestId,
        'sandbox',
        billing,
      );
      await payments.settleReceipts(
        booking.bookingId,
        payment.paymentId,
        'sandbox',
        [
          {
            paymentId: 'fixed-receipt',
            orderId: payment.paymentId,
            amount: 175000,
            status: 'RECEIVED',
          },
        ],
      );
      expect(await uses()).toBe(1);
      expect((await payments.status(booking.bookingId, guestId)).status).toBe(
        'CONFIRMED',
      );
    });
  },
);
