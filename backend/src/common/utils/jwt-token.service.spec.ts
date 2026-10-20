import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const secret = 'unit-test-jwt-secret-with-32-bytes';
  const issuer = 'hotel-website';
  let service: JwtTokenService;

  beforeEach(() => {
    service = new JwtTokenService({
      getOrThrow: jest.fn().mockReturnValue({ secret, issuer }),
    } as unknown as ConfigService);
  });

  const signedToken = (
    payload: unknown,
    header: unknown = { alg: 'HS256', typ: 'JWT' },
  ): string => {
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      'base64url',
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', secret)
      .update(unsignedToken)
      .digest('base64url');
    return `${unsignedToken}.${signature}`;
  };

  it('should issue an HS256 token with guest claims and a 24 hour expiry', () => {
    // Arrange
    const issuedAt = 1_800_000_000;
    const guestId = '5dce7d08-2686-4afb-a663-f3c21a7b6632';

    // Act
    const token = service.issue(guestId, issuedAt);
    const [header, payload, signature] = token.split('.');

    // Assert
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({
      alg: 'HS256',
      typ: 'JWT',
    });
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toEqual({
      iss: issuer,
      sub: guestId,
      iat: issuedAt,
      exp: issuedAt + 86400,
      role: 'GUEST',
    });
    expect(signature).toBe(
      createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url'),
    );
  });

  it('should verify a valid guest token', () => {
    // Arrange
    const issuedAt = 1_800_000_000;
    const guestId = '5dce7d08-2686-4afb-a663-f3c21a7b6632';
    const token = service.issue(guestId, issuedAt);

    // Act
    const claims = service.verify(token, issuedAt + 1);

    // Assert
    expect(claims).toEqual({
      iss: issuer,
      sub: guestId,
      iat: issuedAt,
      exp: issuedAt + 86400,
      role: 'GUEST',
    });
  });

  it.each([
    ['invalid structure', 'not-a-token'],
    [
      'invalid signature',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJob3RlbC13ZWJzaXRlIn0.invalid',
    ],
  ])('should reject a token with %s', (_scenario, token) => {
    expect(service.verify(token)).toBeNull();
  });

  it('should reject an oversized token', () => {
    expect(service.verify('a'.repeat(4097))).toBeNull();
  });

  it('should reject a token containing non-base64url characters', () => {
    expect(service.verify('a.b.c!')).toBeNull();
  });

  it('should reject a signature with the correct length but incorrect value', () => {
    const issuedAt = 1_800_000_000;
    const token = service.issue(
      '5dce7d08-2686-4afb-a663-f3c21a7b6632',
      issuedAt,
    );
    const [header, payload, signature] = token.split('.');
    const changedSignature = `${
      signature[0] === 'A' ? 'B' : 'A'
    }${signature.slice(1)}`;

    expect(
      service.verify(`${header}.${payload}.${changedSignature}`, issuedAt + 1),
    ).toBeNull();
  });

  it.each([
    [
      'an unsupported algorithm',
      { alg: 'none', typ: 'JWT' },
      {
        iss: issuer,
        sub: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
        iat: 1_800_000_000,
        exp: 1_800_086_400,
        role: 'GUEST',
      },
    ],
    [
      'a non-JWT type',
      { alg: 'HS256', typ: 'JWE' },
      {
        iss: issuer,
        sub: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
        iat: 1_800_000_000,
        exp: 1_800_086_400,
        role: 'GUEST',
      },
    ],
    [
      'the wrong issuer',
      { alg: 'HS256', typ: 'JWT' },
      {
        iss: 'another-service',
        sub: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
        iat: 1_800_000_000,
        exp: 1_800_086_400,
        role: 'GUEST',
      },
    ],
    [
      'a malformed subject',
      { alg: 'HS256', typ: 'JWT' },
      {
        iss: issuer,
        sub: 'not-a-uuid',
        iat: 1_800_000_000,
        exp: 1_800_086_400,
        role: 'GUEST',
      },
    ],
    [
      'a non-guest role',
      { alg: 'HS256', typ: 'JWT' },
      {
        iss: issuer,
        sub: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
        iat: 1_800_000_000,
        exp: 1_800_086_400,
        role: 'ADMIN',
      },
    ],
    [
      'a non-numeric issued-at claim',
      { alg: 'HS256', typ: 'JWT' },
      {
        iss: issuer,
        sub: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
        iat: 'now',
        exp: 1_800_086_400,
        role: 'GUEST',
      },
    ],
    [
      'a non-numeric expiry claim',
      { alg: 'HS256', typ: 'JWT' },
      {
        iss: issuer,
        sub: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
        iat: 1_800_000_000,
        exp: 'later',
        role: 'GUEST',
      },
    ],
    [
      'an expiry outside the 24-hour lifetime',
      { alg: 'HS256', typ: 'JWT' },
      {
        iss: issuer,
        sub: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
        iat: 1_800_000_000,
        exp: 1_800_086_401,
        role: 'GUEST',
      },
    ],
  ])('should reject a token with %s', (_scenario, header, payload) => {
    expect(
      service.verify(signedToken(payload, header), 1_800_000_001),
    ).toBeNull();
  });

  it('should reject malformed JSON in a correctly signed token', () => {
    const encodedHeader = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const encodedPayload = Buffer.from('{').toString('base64url');
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', secret)
      .update(unsignedToken)
      .digest('base64url');

    expect(service.verify(`${unsignedToken}.${signature}`)).toBeNull();
  });

  it('should reject an expired token', () => {
    // Arrange
    const issuedAt = 1_800_000_000;
    const token = service.issue(
      '5dce7d08-2686-4afb-a663-f3c21a7b6632',
      issuedAt,
    );

    // Act & Assert
    expect(service.verify(token, issuedAt + 86400)).toBeNull();
  });

  it('should reject a token issued in the future', () => {
    // Arrange
    const issuedAt = 1_800_000_000;
    const token = service.issue(
      '5dce7d08-2686-4afb-a663-f3c21a7b6632',
      issuedAt,
    );

    // Act & Assert
    expect(service.verify(token, issuedAt - 1)).toBeNull();
  });
});
