import { readQuote, signQuote } from './quote-token';

describe('Stateless signed price previews', () => {
  const secret = 'fixture-signing-secret-at-least-32-bytes';
  const preview = {
    quoteId: 'fixture-quote',
    guestId: 'guest-1',
    input: {
      roomTypeId: 'fixture-room',
      checkInDate: '2099-12-10',
      checkOutDate: '2099-12-12',
      numberOfGuests: 2,
    },
    pricing: { totalAmount: 2000000, nightlyRate: 1000000 },
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
  it('preserves authoritative prices without a quote table', () => {
    expect(readQuote(signQuote(preview, secret), secret, 'guest-1')).toEqual(
      preview,
    );
  });
  it('rejects changed prices, another guest and a different signing key', () => {
    const token = signQuote(preview, secret);
    expect(readQuote(token, secret, 'guest-2')).toBeNull();
    expect(
      readQuote(
        token,
        'a-different-signing-secret-at-least-32-bytes',
        'guest-1',
      ),
    ).toBeNull();
    const [body, mac] = token.split('.');
    const modified = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as typeof preview;
    modified.pricing.totalAmount = 1;
    expect(
      readQuote(
        `${Buffer.from(JSON.stringify(modified)).toString('base64url')}.${mac}`,
        secret,
        'guest-1',
      ),
    ).toBeNull();
  });
  it('rejects malformed and oversized tokens and missing signing configuration', () => {
    expect(readQuote('invalid', secret, 'guest-1')).toBeNull();
    expect(readQuote('a'.repeat(16001), secret, 'guest-1')).toBeNull();
    expect(() => signQuote(preview, 'short')).toThrow();
  });
});
