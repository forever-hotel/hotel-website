import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  BookingChangeEmailService,
  changeEmailText,
} from './booking-change-email.service';
import type { ManagementEvent } from './booking-management.repository';

describe('Durable booking change email delivery', () => {
  let event: ManagementEvent;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const manager = { query: jest.fn() };
  const source = { transaction: jest.fn(), query: jest.fn() };
  let service: BookingChangeEmailService;
  beforeEach(() => {
    jest.resetAllMocks();
    event = {
      id: 'operation',
      key: 'hash',
      hash: 'request',
      kind: 'CANCELLED',
      at: new Date().toISOString(),
      policyVersion: 'fixture',
      email: { state: 'PENDING' },
      receipt: {
        bookingId: 'booking',
        roomType: 'Suite',
        status: 'CANCELLED',
        checkInDate: '2099-12-10',
        checkOutDate: '2099-12-12',
        numberOfGuests: 2,
        totalAmount: 2000000,
        currency: 'LKR',
        paidAmount: 2000000,
        balanceAmount: 0,
        refundAmount: 2000000,
        refundStatus: 'PENDING',
        revision: 1,
      },
    };
    source.transaction.mockImplementation(
      (work: (manager: object) => Promise<unknown>) => work(manager),
    );
    manager.query.mockImplementation((sql: string) =>
      Promise.resolve(
        sql.startsWith('SELECT')
          ? [{ email: 'guest@example.com', events: [event] }]
          : [],
      ),
    );
    source.query.mockResolvedValue([]);
    const values: Record<string, string> = {
      BOOKING_EMAIL_MODE: 'sandbox',
      BREVO_API_KEY: 'fixture',
      BOOKING_EMAIL_FROM: 'hotel@example.com',
      NODE_ENV: 'test',
    };
    service = new BookingChangeEmailService(
      source as unknown as DataSource,
      { get: (key: string) => values[key] } as ConfigService,
    );
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ messageId: 'fixture' }), { status: 201 }),
      );
  });
  afterEach(() => jest.restoreAllMocks());
  it('states actual cancellation and pending refund without claiming money was returned', async () => {
    const text = changeEmailText(event);
    expect(text).toContain('Your reservation has been cancelled.');
    expect(text).toContain('Refund awaiting hotel review: LKR 20000.00');
    expect(text).toContain('No refund has been issued');
    expect(await service.send('booking', 'operation')).toBe('SANDBOX');
    expect(source.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['SANDBOX']),
    );
  });
  it('describes modified dates, prices and a balance for staff collection', () => {
    event.kind = 'MODIFIED';
    event.receipt.balanceAmount = 1000000;
    event.receipt.refundAmount = 0;
    event.receipt.status = 'CONFIRMED';
    const text = changeEmailText(event);
    expect(text).toContain('Your reservation has been updated.');
    expect(text).toContain('Balance: LKR 10000.00');
    expect(text).toContain('Contact the hotel');
    expect(text).not.toContain('Refund awaiting');
  });
  it.each(['ACCEPTED', 'SANDBOX', 'UNKNOWN', 'SENDING'] as const)(
    'does not resend %s email',
    async (state) => {
      event.email.state = state;
      expect(await service.send('booking', 'operation')).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('defers definite failures during cooldown and retries only after it', async () => {
    event.email = { state: 'FAILED', attemptedAt: new Date().toISOString() };
    expect(await service.send('booking', 'operation')).toBeNull();
    event.email.attemptedAt = new Date(Date.now() - 120000).toISOString();
    expect(await service.send('booking', 'operation')).toBe('SANDBOX');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('ignores missing bookings, missing management history and unknown operation IDs', async () => {
    manager.query.mockResolvedValueOnce([]);
    expect(await service.send('booking', 'operation')).toBeNull();
    manager.query.mockResolvedValueOnce([
      { email: 'guest@example.com', events: null },
    ]);
    expect(await service.send('booking', 'operation')).toBeNull();
    expect(await service.send('booking', 'missing')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('returns an honest unknown state on storage failure before or after provider acceptance', async () => {
    source.transaction.mockRejectedValueOnce(
      new Error('private connection detail'),
    );
    expect(await service.send('booking', 'operation')).toBe('UNKNOWN');
    expect(fetchMock).not.toHaveBeenCalled();
    source.query.mockRejectedValueOnce(new Error('private persistence error'));
    expect(await service.send('booking', 'operation')).toBe('UNKNOWN');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not claim successful email delivery for an ambiguous provider response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    expect(await service.send('booking', 'operation')).toBe('UNKNOWN');
  });
});
