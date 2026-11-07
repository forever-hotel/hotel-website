import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isEmail } from 'class-validator';
import { GuestRepository } from '../database/repositories/guest.repository';
import { JwtConfig } from '../config/configuration';
import { PasswordHasher } from './password-hasher.service';

export const RESET_MESSAGE =
  'If an account exists for that email, a password reset link will be sent.';
const TTL = 15 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(
    private readonly guests: GuestRepository,
    private readonly hasher: PasswordHasher,
    private readonly config: ConfigService,
  ) {}

  private signature(id: string, expires: string, hash: string): string {
    return createHmac('sha256', this.config.getOrThrow<JwtConfig>('jwt').secret)
      .update(JSON.stringify(['password-reset-v1', id, expires, hash]))
      .digest('base64url');
  }

  async request(email: string): Promise<{ message: string }> {
    const key = this.config.get<string>('BREVO_API_KEY');
    const from =
      this.config.get<string>('PASSWORD_RESET_EMAIL_FROM') ||
      this.config.get<string>('CONTACT_EMAIL_FROM');
    let origin: URL;
    try {
      origin = new URL(this.config.getOrThrow<string>('PASSWORD_RESET_ORIGIN'));
      if (
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash ||
        (origin.protocol !== 'https:' &&
          !(
            this.config.get<string>('NODE_ENV') !== 'production' &&
            origin.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(origin.hostname)
          ))
      )
        throw new Error();
      if (!key || !from || !isEmail(from)) throw new Error();
    } catch {
      throw new ServiceUnavailableException(
        'Password recovery is not configured. Please contact the hotel.',
      );
    }
    const guest = await this.guests.findByEmailForAuthentication(email);
    if (guest?.passwordHash) {
      const expires = String(Date.now() + TTL);
      const token = `${guest.guestId}.${expires}.${this.signature(guest.guestId, expires, guest.passwordHash)}`;
      // Fragment keeps the token out of HTTP access logs and referrer headers.
      const link = `${origin.origin}/reset-password#token=${token}`;
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': key, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            sender: { email: from },
            to: [{ email: guest.email }],
            subject: 'Reset your Forever City Hotel password',
            textContent: `Use this link to choose a new password:\n\n${link}\n\nThis link expires in 15 minutes and can only be used once. If you did not request this, ignore this email.`,
          }),
        });
        if (!response.ok)
          this.logger.error(
            'Password reset email was rejected by the email provider',
          );
      } catch {
        this.logger.error('Password reset email delivery failed');
      }
    }
    return { message: RESET_MESSAGE };
  }

  async reset(token: string, password: string): Promise<{ message: string }> {
    const invalid = () =>
      new BadRequestException({
        error: 'INVALID_RESET_TOKEN',
        message:
          'This reset link is invalid or expired. Please request a new one.',
      });
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[0-9]{13}\.[A-Za-z0-9_-]{43}$/i.test(
        token,
      )
    )
      throw invalid();
    const [id, expires, supplied] = token.split('.');
    const remaining = Number(expires) - Date.now();
    if (remaining <= 0 || remaining > TTL) throw invalid();
    const guest = await this.guests.findByIdForPasswordReset(id);
    if (!guest?.passwordHash) throw invalid();
    const expected = this.signature(id, expires, guest.passwordHash);
    if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)))
      throw invalid();
    const hash = await this.hasher.hash(password);
    // Compare-and-swap makes concurrent uses of the same link single-use.
    if (
      !(await this.guests.replacePassword(
        id,
        guest.passwordHash,
        hash,
        new Date(Number(expires)),
      ))
    )
      throw invalid();
    return {
      message:
        'Your password has been changed. Please sign in with your new password.',
    };
  }
}
