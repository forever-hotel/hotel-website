import { ConfigService } from '@nestjs/config';
import {
  ConfirmationEmailRepository,
  Receipt,
} from './confirmation-email.repository';
import {
  ConfirmationEmailService,
  receiptText,
} from './confirmation-email.service';

const brevoAccepted = () =>
  Promise.resolve(
    new Response(JSON.stringify({ messageId: 'brevo-fixture' }), {
      status: 201,
    }),
  );

describe('Booking confirmation email', () => {
  const receipt: Receipt = {
    bookingId: 'booking',
    email: 'guest@example.com',
    roomType: 'Double',
    checkInDate: '2099-12-10',
    checkOutDate: '2099-12-12',
    currency: 'LKR',
    totalAmount: 2000000,
    paidAmount: 700000,
  };
  const repository = { claim: jest.fn(), finish: jest.fn() };
  let values: Record<string, string>;
  let service: ConfirmationEmailService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  beforeEach(() => {
    jest.clearAllMocks();
    values = {
      BOOKING_EMAIL_MODE: 'sandbox',
      BREVO_API_KEY: 'fixture',
      BOOKING_EMAIL_FROM: 'hotel@example.com',
      NODE_ENV: 'test',
    };
    repository.claim.mockResolvedValue(receipt);
    repository.finish.mockResolvedValue(undefined);
    service = new ConfirmationEmailService(
      repository as unknown as ConfirmationEmailRepository,
      {
        get: (key: string, fallback?: string) => values[key] || fallback,
      } as ConfigService,
    );
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(brevoAccepted);
  });
  afterEach(() => jest.restoreAllMocks());

  it('uses confirmed receipt data and correct deposit/balance minor units', () => {
    expect(receiptText(receipt)).toBe(
      'Your reservation is confirmed.\nBooking reference: booking\nRoom: Double\nCheck-in: 2099-12-10\nCheck-out: 2099-12-12\nTotal: LKR 20000.00\nPaid: LKR 7000.00\nBalance: LKR 13000.00',
    );
    expect(receiptText({ ...receipt, paidAmount: 2000000 })).toContain(
      'Balance: LKR 0.00',
    );
  });
  it('validates once in Brevo sandbox without claiming delivery', async () => {
    await service.send('booking');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      textContent: string;
      headers: object;
      to: object[];
    };
    expect(body.textContent).toBe(receiptText(receipt));
    expect(body.headers).toEqual({ 'X-Sib-Sandbox': 'drop' });
    expect(body.to).toEqual([{ email: receipt.email }]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.brevo.com/v3/smtp/email',
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      'api-key': 'fixture',
      'Content-Type': 'application/json',
    });
    expect(repository.finish).toHaveBeenCalledWith('booking', 'SANDBOX');
    repository.claim.mockResolvedValue(null);
    await service.send('booking');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('sends nothing before a confirmed paid booking is claimed', async () => {
    repository.claim.mockResolvedValue(null);
    await service.send('booking');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['off', 'send'])(
    'disables %s outside production and records a retryable failure',
    async (mode) => {
      values.BOOKING_EMAIL_MODE = mode;
      await service.send('booking');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(repository.finish).toHaveBeenCalledWith('booking', 'FAILED');
    },
  );
  it.each(['BREVO_API_KEY', 'BOOKING_EMAIL_FROM'])(
    'fails safely with missing %s',
    async (key) => {
      delete values[key];
      await service.send('booking');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(repository.finish).toHaveBeenCalledWith('booking', 'FAILED');
    },
  );
  it('records provider acceptance separately from delivery in production', async () => {
    values.NODE_ENV = 'production';
    values.BOOKING_EMAIL_MODE = 'send';
    await service.send('booking');
    expect(repository.finish).toHaveBeenCalledWith('booking', 'ACCEPTED');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      headers?: object;
    };
    expect(body.headers).toBeUndefined();
  });
  it('reuses the existing contact sender when no booking sender is configured', async () => {
    delete values.BOOKING_EMAIL_FROM;
    values.CONTACT_EMAIL_FROM = 'contact@example.com';
    await service.send('booking');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      sender: { email: string };
    };
    expect(body.sender.email).toBe('contact@example.com');
    expect(repository.finish).toHaveBeenCalledWith('booking', 'SANDBOX');
  });
  it.each([{}, { messageId: '' }, { messageId: 123 }, null])(
    'does not claim acceptance for malformed Brevo success %j',
    async (body) => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(body), { status: 201 }),
      );
      await service.send('booking');
      expect(repository.finish).toHaveBeenCalledWith('booking', 'UNKNOWN');
    },
  );
  it('does not claim acceptance for invalid JSON', async () => {
    fetchMock.mockResolvedValue(new Response('invalid JSON', { status: 201 }));
    await service.send('booking');
    expect(repository.finish).toHaveBeenCalledWith('booking', 'UNKNOWN');
  });
  it('records explicit rejection for retry and later succeeds', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
    await expect(service.send('booking')).resolves.toBeUndefined();
    expect(repository.finish).toHaveBeenLastCalledWith('booking', 'FAILED');
    await service.send('booking');
    expect(repository.finish).toHaveBeenLastCalledWith('booking', 'SANDBOX');
  });
  it.each([202, 500])(
    'does not blindly retry an unexpected %s response',
    async (status) => {
      fetchMock.mockResolvedValue(new Response(null, { status }));
      await service.send('booking');
      expect(repository.finish).toHaveBeenCalledWith('booking', 'UNKNOWN');
    },
  );
  it('preserves paid state on network failure or persistence failure', async () => {
    fetchMock.mockRejectedValue(new Error('private provider details'));
    await expect(service.send('booking')).resolves.toBeUndefined();
    expect(repository.finish).toHaveBeenCalledWith('booking', 'UNKNOWN');
    repository.claim.mockRejectedValueOnce(new Error('db unavailable'));
    await expect(service.send('booking')).resolves.toBeUndefined();
    repository.finish.mockRejectedValueOnce(new Error('db unavailable'));
    await expect(service.send('booking')).resolves.toBeUndefined();
  });
});
