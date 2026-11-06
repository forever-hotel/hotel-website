import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GuestRepository } from '../database/repositories/guest.repository';
import { PasswordResetService, RESET_MESSAGE } from './password-reset.service';
import { PasswordHasher } from './password-hasher.service';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('PasswordResetService', () => {
  const id = '5dce7d08-2686-4afb-a663-f3c21a7b6632';
  let currentHash: string;
  let repository: {
    findByEmailForAuthentication: jest.Mock;
    findByIdForPasswordReset: jest.Mock;
    replacePassword: jest.Mock;
  };
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let service: PasswordResetService;
  let hasher: { hash: jest.Mock };
  let settings: Record<string, unknown>;
  beforeEach(() => {
    currentHash = 'old-password-hash';
    const guest = () => ({
      guestId: id,
      email: 'guest@example.com',
      passwordHash: currentHash,
    });
    repository = {
      findByEmailForAuthentication: jest.fn(() => Promise.resolve(guest())),
      findByIdForPasswordReset: jest.fn(() => Promise.resolve(guest())),
      replacePassword: jest.fn(
        (_id: string, previous: string, next: string) => {
          if (currentHash !== previous) return Promise.resolve(false);
          currentHash = next;
          return Promise.resolve(true);
        },
      ),
    };
    hasher = { hash: jest.fn().mockResolvedValue('new-password-hash') };
    settings = {
      jwt: { secret: 'test-secret' },
      NODE_ENV: 'development',
      BREVO_API_KEY: 'test-key',
      CONTACT_EMAIL_FROM: 'hotel@example.com',
      PASSWORD_RESET_ORIGIN: 'http://localhost:3001',
    };
    service = new PasswordResetService(
      repository as unknown as GuestRepository,
      hasher as unknown as PasswordHasher,
      new ConfigService(settings),
    );
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 201 }));
  });
  afterEach(() => jest.restoreAllMocks());
  async function token() {
    await service.request('guest@example.com');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      textContent: string;
    };
    return body.textContent.match(/#token=(\S+)/)![1];
  }
  it('emails an expiring link without exposing the token in the response', async () => {
    const result = await service.request('guest@example.com');
    expect(result).toEqual({ message: RESET_MESSAGE });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(currentHash);
  });
  it('gives the same response for unknown accounts without sending mail', async () => {
    repository.findByEmailForAuthentication.mockResolvedValue(null);
    expect(await service.request('missing@example.com')).toEqual({
      message: RESET_MESSAGE,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('changes the password and rejects replay', async () => {
    const value = await token();
    await expect(
      service.reset(value, 'new passphrase'),
    ).resolves.toHaveProperty('message');
    expect(currentHash).toBe('new-password-hash');
    await expect(
      service.reset(value, 'another passphrase'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('allows only one concurrent reset', async () => {
    const value = await token();
    const results = await Promise.allSettled([
      service.reset(value, 'password one'),
      service.reset(value, 'password two'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
  });
  it('rejects tampered, malformed and expired links without hashing a new password', async () => {
    const value = await token();
    await expect(
      service.reset(
        value.slice(0, -1) + (value.endsWith('a') ? 'b' : 'a'),
        'password',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reset('invalid', 'password')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 16 * 60 * 1000);
    await expect(service.reset(value, 'password')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(hasher.hash).not.toHaveBeenCalled();
  });
  it('handles missing accounts and a concurrent password change', async () => {
    const value = await token();
    repository.findByIdForPasswordReset.mockResolvedValueOnce(null);
    await expect(service.reset(value, 'password')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    repository.replacePassword.mockResolvedValue(false);
    await expect(service.reset(value, 'password')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('does not expose account existence when delivery fails', async () => {
    fetchMock.mockRejectedValue(new Error('network unavailable'));
    expect(await service.request('guest@example.com')).toEqual({
      message: RESET_MESSAGE,
    });
  });
  it('rejects missing configuration and unsafe production origins', async () => {
    delete settings.BREVO_API_KEY;
    await expect(service.request('guest@example.com')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    settings.BREVO_API_KEY = 'key';
    settings.NODE_ENV = 'production';
    await expect(service.request('guest@example.com')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('validates email, token and password length including UTF-8 bytes', async () => {
    expect(
      await validate(plainToInstance(ForgotPasswordDto, { email: 'invalid' })),
    ).not.toHaveLength(0);
    const value = await token();
    expect(
      await validate(
        plainToInstance(ResetPasswordDto, {
          token: value,
          password: 'valid passphrase',
        }),
      ),
    ).toHaveLength(0);
    for (const password of ['short', 'é'.repeat(37)]) {
      expect(
        await validate(
          plainToInstance(ResetPasswordDto, { token: value, password }),
        ),
      ).not.toHaveLength(0);
    }
  });
});
