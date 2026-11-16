import { ConfigService } from '@nestjs/config';
import { ContactService } from './contact.service';

const enquiry = {
  name: 'Nimali Perera',
  email: 'nimali@example.test',
  subject: 'General enquiry',
  message: 'Please tell me about room options.',
};

describe('ContactService', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });
  function service(overrides: Record<string, string> = {}) {
    return new ContactService(
      new ConfigService({
        CONTACT_EMAIL_MODE: 'send',
        BREVO_API_KEY: 'test-key',
        CONTACT_EMAIL_FROM: 'website@example.test',
        CONTACT_EMAIL_TO: 'hotel@example.test',
        ...overrides,
      }),
    );
  }

  it('sends plain-text email to configured management with guest reply-to', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ messageId: 'test-message-id' }, { status: 201 }),
    );
    await expect(service().send(enquiry)).resolves.toEqual({
      status: 'accepted',
    });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      to: [{ email: 'hotel@example.test' }],
      sender: { email: 'website@example.test', name: 'Forever City Hotel' },
      replyTo: { email: enquiry.email },
    });
    expect(body.textContent).toEqual(expect.stringContaining(enquiry.message));
    expect(body).not.toHaveProperty('headers');
    expect(options.headers).toMatchObject({ 'api-key': 'test-key' });
  });
  it('reports sandbox validation as not sent', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ messageId: 'sandbox-message-id' }, { status: 201 }),
    );
    await expect(
      service({ CONTACT_EMAIL_MODE: 'sandbox' }).send({
        ...enquiry,
        phone: '+94771234567',
      }),
    ).resolves.toEqual({ status: 'sandbox' });
    expect(
      JSON.parse(
        (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
      ),
    ).toMatchObject({ headers: { 'X-Sib-Sandbox': 'drop' } });
  });
  it.each([
    { CONTACT_EMAIL_MODE: 'off' },
    { CONTACT_EMAIL_MODE: 'invalid' },
    { BREVO_API_KEY: '' },
    { CONTACT_EMAIL_FROM: '' },
    { CONTACT_EMAIL_TO: '' },
    { CONTACT_EMAIL_FROM: 'bad' },
    { CONTACT_EMAIL_TO: 'bad' },
  ])(
    'rejects disabled or invalid configuration without sending: %j',
    async (overrides) => {
      await expect(service(overrides).send(enquiry)).rejects.toMatchObject({
        status: 503,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('defaults to off with no configuration', async () => {
    await expect(
      new ContactService(new ConfigService()).send(enquiry),
    ).rejects.toMatchObject({ status: 503 });
  });
  it.each([400, 401, 429, 500, 200])(
    'hides provider error %s in live mode',
    async (status) => {
      fetchMock.mockResolvedValue({ status });
      await expect(service().send(enquiry)).rejects.toMatchObject({
        response: { error: 'CONTACT_UNAVAILABLE' },
      });
    },
  );
  it.each([null, {}, { messageId: '' }, { messageId: 123 }])(
    'rejects malformed provider acknowledgement %j',
    async (result) => {
      fetchMock.mockResolvedValue(Response.json(result, { status: 201 }));
      await expect(service().send(enquiry)).rejects.toMatchObject({
        status: 503,
      });
    },
  );
  it('rejects invalid JSON acknowledgement', async () => {
    fetchMock.mockResolvedValue(new Response('not-json', { status: 201 }));
    await expect(service().send(enquiry)).rejects.toMatchObject({
      status: 503,
    });
  });
  it.each([
    new Error('Network error'),
    new DOMException('Timeout', 'TimeoutError'),
  ])(
    'handles network/timeout failure without exposing provider data',
    async (error) => {
      fetchMock.mockRejectedValue(error);
      await expect(service().send(enquiry)).rejects.toMatchObject({
        response: { error: 'CONTACT_UNAVAILABLE' },
      });
    },
  );
});
