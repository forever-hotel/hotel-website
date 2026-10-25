import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import request from 'supertest';
import {
  PayHereProvider,
  payhereAmount,
  payhereMd5,
} from '../../src/payments/payhere-provider';
import type { PayHereReceipt } from '../../src/payments/payhere-provider';
import { HttpContractFixture } from '../support/http-contract-fixture';

interface QuoteBody {
  quoteId: string;
  quoteToken: string;
  totalAmount: number;
}
interface CheckoutBody {
  bookingId: string;
  checkout: { fields: Record<string, string> };
}
const json = <T>(response: { body: unknown }): T => response.body as T;

describe('HTTP producer → actual frontend consumer contracts', () => {
  const fixture = new HttpContractFixture();
  let roomId: string;
  let owner: string;
  let other: string;
  let receipts: PayHereReceipt[];
  let brevoStatus: number;
  let emails: { subject: string; textContent: string; headers: object }[];
  let receiptMock: jest.SpiedFunction<PayHereProvider['receipts']>;
  beforeAll(async () => {
    await fixture.open();
  }, 60000);
  afterAll(async () => {
    await fixture.close();
  });
  async function login(label: string) {
    const credentials = {
      fullName: `Contract ${label}`,
      email: `${label}@example.invalid`,
      password: 'contract-fixture-passphrase',
    };
    await request(fixture.app.getHttpServer())
      .post('/hw/guests/register')
      .send(credentials)
      .expect(201);
    const response = await request(fixture.app.getHttpServer())
      .post('/hw/guests/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    expect(JSON.stringify(response.body)).not.toMatch(
      /passwordHash|passphrase/,
    );
    return json<{ accessToken: string }>(response).accessToken;
  }
  beforeEach(async () => {
    await fixture.reset();
    roomId = randomUUID();
    receipts = [];
    emails = [];
    brevoStatus = 201;
    jest.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
      if (url !== 'https://api.brevo.com/v3/smtp/email')
        throw new Error('Unexpected external network request in contract test');
      if (typeof options?.body !== 'string')
        throw new Error('Expected a JSON email request');
      emails.push(JSON.parse(options.body) as (typeof emails)[number]);
      return Promise.resolve(
        new Response(
          JSON.stringify(
            brevoStatus === 201
              ? { messageId: 'contract-fixture-mail' }
              : { message: 'fixture-private-provider-error' },
          ),
          { status: brevoStatus },
        ),
      );
    });
    receiptMock = jest
      .spyOn(fixture.app.get(PayHereProvider), 'receipts')
      .mockImplementation(() => Promise.resolve(receipts));
    await fixture.runner.query(
      "INSERT INTO pg_temp.room_types (room_type_id,type_name,price_per_night,max_guests) VALUES ($1,'HTTP Contract Suite',1000000,2)",
      [roomId],
    );
    await fixture.runner.query(
      "INSERT INTO pg_temp.room_type_images (room_type_id,image_url) VALUES ($1,'/images/contract-suite.webp')",
      [roomId],
    );
    await fixture.runner.query(
      "INSERT INTO pg_temp.room_type_amenities (room_type_id,amenity) VALUES ($1,'Wi-Fi')",
      [roomId],
    );
    await fixture.runner.query(
      "INSERT INTO pg_temp.rooms (room_number,room_type_id,floor,status) VALUES ('CONTRACT',$1,1,'VACANT')",
      [roomId],
    );
    const promotionId = randomUUID();
    await fixture.runner.query(
      `INSERT INTO pg_temp.mad_promotion_codes (promo_id,code_string,discount_type,discount_value,valid_from,valid_until,max_redemptions,current_redemptions,status)
      VALUES ($1,'CONTRACT10','PERCENTAGE',10,statement_timestamp()-interval '1 day',statement_timestamp()+interval '1 day',10,0,'ACTIVE')`,
      [promotionId],
    );
    await fixture.runner.query(
      'INSERT INTO pg_temp.mad_promotion_room_types (promo_id,room_type_id) VALUES ($1,$2)',
      [promotionId, roomId],
    );
    owner = await login('owner');
    other = await login('other');
  }, 60000);
  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture.rollback();
  });
  const stay = () => ({
    roomTypeId: roomId,
    checkInDate: '2099-12-10',
    checkOutDate: '2099-12-12',
    numberOfGuests: 2,
  });
  const get = (path: string, token = owner) =>
    request(fixture.app.getHttpServer())
      .get(`/hw${path}`)
      .set('Authorization', `Bearer ${token}`);
  const post = (
    path: string,
    payload: object,
    token = owner,
    key = 'contract-request-key',
  ) =>
    request(fixture.app.getHttpServer())
      .post(`/hw${path}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(payload);
  async function checkout() {
    const quote = await post('/booking-quotes', stay()).expect(201);
    const checkout = await post('/payments/checkout', {
      quoteToken: json<QuoteBody>(quote).quoteToken,
      paymentOption: 'FULL',
      billing: {
        firstName: 'Contract',
        lastName: 'Guest',
        phone: '0771234567',
        address: 'Fixture street',
        city: 'Colombo',
        country: 'Sri Lanka',
      },
    }).expect(201);
    return { quote, checkout, data: json<CheckoutBody>(checkout) };
  }
  function notification(data: CheckoutBody) {
    const amount = data.checkout.fields.amount;
    return {
      merchant_id: '123456',
      order_id: data.checkout.fields.order_id,
      payment_id: '123456789',
      payhere_amount: amount,
      payhere_currency: 'LKR',
      status_code: '2',
      md5sig: payhereMd5(
        `123456${data.checkout.fields.order_id}${amount}LKR2${payhereMd5('fixture-only-merchant-secret')}`,
      ),
    };
  }
  const notify = (payload: object) =>
    request(fixture.app.getHttpServer())
      .post('/hw/payments/payhere/notify')
      .type('form')
      .send(payload);

  it('connects catalogue, availability, promotions, auth, quote, PayHere settlement, email and management to real frontend parsers', async () => {
    const data: Record<string, unknown> = {};
    data.catalogue = json(await get('/room-types').expect(200));
    data.availability = json(
      await get(
        `/availability?${new URLSearchParams(Object.entries(stay()).map(([key, value]) => [key, String(value)]))}`,
      ).expect(200),
    );
    const calendar = await get(
      `/room-types/${roomId}/availability-calendar?from=2099-12-10&to=2099-12-12`,
    ).expect(200);
    expect(json<{ days: unknown[] }>(calendar).days).toHaveLength(2);
    data.promotions = json(await get('/promotions?limit=20').expect(200));
    const created = await checkout();
    const id = created.data.bookingId;
    data.quote = json(created.quote);
    data.checkout = created.data;
    data.pending = json(await get(`/payments/${id}`).expect(200));
    expect(emails).toHaveLength(0);
    receipts = [
      {
        paymentId: '123456789',
        orderId: created.data.checkout.fields.order_id,
        amount: json<QuoteBody>(created.quote).totalAmount,
        status: 'RECEIVED',
      },
    ];
    await notify(notification(created.data)).expect(200);
    await notify(notification(created.data)).expect(200);
    expect(emails).toHaveLength(1);
    expect(emails[0].headers).toEqual({ 'X-Sib-Sandbox': 'drop' });
    expect(emails[0].textContent).toContain(`Booking reference: ${id}`);
    data.confirmed = json(await get(`/payments/${id}`).expect(200));
    data.profile = json(
      await get('/bookings?category=upcoming&page=1').expect(200),
    );
    data.detail = json(await get(`/bookings/${id}`).expect(200));
    data.management = json(await get(`/bookings/${id}/management`).expect(200));
    const changedStay = {
      ...stay(),
      checkInDate: '2099-12-12',
      checkOutDate: '2099-12-14',
      specialRequests: 'Quiet room',
    };
    const quote = await post(
      `/bookings/${id}/change-quote`,
      changedStay,
    ).expect(200);
    data.changeQuote = json(quote);
    data.modified = json(
      await post(
        `/bookings/${id}/changes`,
        { quoteToken: json<QuoteBody>(quote).quoteToken },
        owner,
        'contract-change-key',
      ).expect(200),
    );
    const changed = json<{ revision: number }>(
      await get(`/bookings/${id}/management`).expect(200),
    );
    data.cancelled = json(
      await post(
        `/bookings/${id}/cancellations`,
        { revision: changed.revision },
        owner,
        'contract-cancel-key',
      ).expect(200),
    );
    await post(
      `/bookings/${id}/cancellations`,
      { revision: changed.revision },
      owner,
      'contract-cancel-key',
    ).expect(200);
    data.cancelledPayment = json(await get(`/payments/${id}`).expect(200));
    data.cancelledProfile = json(
      await get('/bookings?category=cancelled&page=1').expect(200),
    );
    data.expected = { bookingId: id, stay: stay(), changedStay };
    expect(emails).toHaveLength(3);
    const output = execFileSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--disable-warning=ExperimentalWarning',
        resolve(
          __dirname,
          '../../../frontend/tests/contracts/consume-backend.mjs',
        ),
      ],
      {
        input: JSON.stringify(data),
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000,
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
      },
    );
    expect(JSON.parse(output)).toEqual({
      consumerContracts: 'passed',
      rejectedDriftCases: 16,
    });
  }, 60000);

  it('enforces ownership, invalid JWTs, supported occupancy and explicit unsupported promo/quantity/add-on fields', async () => {
    const created = await checkout();
    const id = created.data.bookingId;
    for (const path of [
      `/bookings/${id}`,
      `/bookings/${id}/management`,
      `/payments/${id}`,
    ]) {
      await get(path, other).expect(404);
      await get(path, 'invalid-token').expect(401);
    }
    const profile = await get(
      '/bookings?category=upcoming&page=1',
      other,
    ).expect(200);
    expect(json<{ items: unknown[] }>(profile).items).toEqual([]);
    await post(`/bookings/${id}/cancellations`, { revision: 0 }, other).expect(
      404,
    );
    for (const field of [
      'promoCode',
      'numberOfRooms',
      'addOns',
      'childCount',
      'guestId',
      'totalAmount',
    ])
      await post('/booking-quotes', {
        ...stay(),
        [field]: field === 'promoCode' ? 'CONTRACT10' : 1,
      }).expect(400);
    await post('/booking-quotes', { ...stay(), numberOfGuests: 3 }).expect(400);
    await post(
      '/bookings',
      { quoteToken: json<QuoteBody>(created.quote).quoteToken },
      other,
      'foreign-reservation-key',
    ).expect(404);
    expect(emails).toHaveLength(0);
  }, 60000);

  it('rejects invalid/unverified payment callbacks and returns honest dependency failures without false confirmation or enquiry success', async () => {
    const created = await checkout();
    const id = created.data.bookingId;
    await notify({
      ...notification(created.data),
      md5sig: '0'.repeat(32),
    }).expect(400);
    await notify(notification(created.data)).expect(503);
    const pending = await get(`/payments/${id}`).expect(200);
    expect(json<{ status: string; paidAmount: number }>(pending)).toMatchObject(
      { status: 'PENDING', paidAmount: 0 },
    );
    receiptMock.mockRejectedValue(new Error('fixture-private-provider-error'));
    const delayed = await get(`/payments/${id}`).expect(200);
    expect(
      json<{ verificationDelayed: boolean }>(delayed).verificationDelayed,
    ).toBe(true);
    expect(JSON.stringify(delayed.body)).not.toContain(
      'fixture-private-provider-error',
    );
    brevoStatus = 503;
    const enquiry = await post('/contact/enquiries', {
      name: 'Contract Guest',
      email: 'enquiry@example.invalid',
      subject: 'Rooms and stays',
      message: 'Please confirm the room facilities.',
    }).expect(503);
    expect(json<{ error: string }>(enquiry).error).toBe('CONTACT_UNAVAILABLE');
    expect(JSON.stringify(enquiry.body)).not.toContain(
      'fixture-private-provider-error',
    );
    expect(payhereAmount(json<QuoteBody>(created.quote).totalAmount)).toBe(
      created.data.checkout.fields.amount,
    );
  }, 60000);
});
