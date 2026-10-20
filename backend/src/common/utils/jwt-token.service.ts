import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthenticatedGuest } from '../interfaces/authenticated-guest.interface';
import { JwtConfig } from '../../config/configuration';
import { JWT_EXPIRES_IN_SECONDS } from '../../config/constants';

interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

@Injectable()
export class JwtTokenService {
  private readonly config: JwtConfig;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<JwtConfig>('jwt');
  }

  issue(guestId: string, now = Math.floor(Date.now() / 1000)): string {
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const payload: AuthenticatedGuest = {
      iss: this.config.issuer,
      sub: guestId,
      iat: now,
      exp: now + JWT_EXPIRES_IN_SECONDS,
      role: 'GUEST',
    };
    const unsignedToken = `${this.encode(header)}.${this.encode(payload)}`;
    return `${unsignedToken}.${this.sign(unsignedToken)}`;
  }

  verify(
    token: string,
    now = Math.floor(Date.now() / 1000),
  ): AuthenticatedGuest | null {
    if (token.length > 4096) {
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !/^[\w-]+$/.test(part))) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = Buffer.from(
      this.sign(unsignedToken),
      'base64url',
    );
    const suppliedSignature = Buffer.from(encodedSignature, 'base64url');
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const header = this.decode<Partial<JwtHeader>>(encodedHeader);
    const claims = this.decode<Partial<AuthenticatedGuest>>(encodedPayload);
    if (
      !header ||
      header.alg !== 'HS256' ||
      header.typ !== 'JWT' ||
      !claims ||
      claims.iss !== this.config.issuer ||
      typeof claims.sub !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        claims.sub,
      ) ||
      typeof claims.iat !== 'number' ||
      !Number.isInteger(claims.iat) ||
      typeof claims.exp !== 'number' ||
      !Number.isInteger(claims.exp) ||
      claims.iat > now ||
      claims.exp <= now ||
      claims.exp !== claims.iat + JWT_EXPIRES_IN_SECONDS ||
      claims.role !== 'GUEST'
    ) {
      return null;
    }

    return {
      iss: claims.iss,
      sub: claims.sub,
      iat: claims.iat,
      exp: claims.exp,
      role: 'GUEST',
    };
  }

  private encode(value: JwtHeader | AuthenticatedGuest): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decode<T>(value: string): T | null {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return null;
      }
      throw error;
    }
  }

  private sign(value: string): string {
    return createHmac('sha256', this.config.secret)
      .update(value)
      .digest('base64url');
  }
}
