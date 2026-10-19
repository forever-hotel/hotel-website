import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '../common/utils/jwt-token.service';
import { GuestRepository } from '../database/repositories/guest.repository';
import { Guest } from './entities/guest.entity';
import { EmailAlreadyRegisteredError } from './errors/email-already-registered.error';
import { LoginGuestDto } from './dto/login-guest.dto';
import { RegisterGuestDto } from './dto/register-guest.dto';
import { GuestsService } from './guests.service';

describe('GuestsService', () => {
  let create: jest.Mock;
  let hash: jest.Mock;
  let compare: jest.Mock;
  let issue: jest.Mock;
  let service: GuestsService;

  const dto: RegisterGuestDto = {
    fullName: 'Nimali Perera',
    email: 'Nimali@Example.com',
    password: 'a long passphrase',
    phone: '+94771234567',
  };

  beforeEach(() => {
    create = jest.fn();
    hash = jest.fn().mockResolvedValue('bcrypt-hash');
    compare = jest.fn();
    issue = jest.fn().mockReturnValue('signed-token');
    service = new GuestsService(
      { create } as unknown as GuestRepository,
      { hash, compare },
      { issue } as unknown as JwtTokenService,
    );
  });

  it('should save the bcrypt hash instead of the password given valid details', async () => {
    // Arrange
    const saved = { guestId: 'guest-1' } as Guest;
    create.mockResolvedValue(saved);

    // Act
    const guest = await service.register(dto);

    // Assert
    expect(guest).toBe(saved);
    expect(hash).toHaveBeenCalledWith('a long passphrase');
    expect(create).toHaveBeenCalledWith({
      fullName: 'Nimali Perera',
      email: 'Nimali@Example.com',
      phone: '+94771234567',
      passwordHash: 'bcrypt-hash',
    });
    expect(JSON.stringify(create.mock.calls)).not.toContain(
      'a long passphrase',
    );
  });

  it('should throw 409 EMAIL_ALREADY_REGISTERED given the email already has an account', async () => {
    // Arrange
    create.mockRejectedValue(new EmailAlreadyRegisteredError());

    // Act
    const result = service.register(dto);

    // Assert
    await expect(result).rejects.toBeInstanceOf(ConflictException);
    await expect(result).rejects.toMatchObject({
      response: {
        error: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email already exists.',
      },
    });
  });

  it('should rethrow any other failure given the repository fails', async () => {
    // Arrange
    const failure = new Error('database down');
    create.mockRejectedValue(failure);

    // Act & Assert
    await expect(service.register(dto)).rejects.toBe(failure);
  });

  describe('login', () => {
    const loginDto: LoginGuestDto = {
      email: 'Nimali@Example.com',
      password: 'a long passphrase',
    };

    const guest = Object.assign(new Guest(), {
      guestId: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
      fullName: 'Nimali Perera',
      email: 'nimali@example.com',
      passwordHash: 'bcrypt-hash',
      createdAt: new Date('2026-10-14T08:00:00Z'),
    });

    it('should issue a guest token given matching credentials', async () => {
      // Arrange
      const findByEmailForAuthentication = jest.fn().mockResolvedValue(guest);
      service = new GuestsService(
        { create, findByEmailForAuthentication } as unknown as GuestRepository,
        {
          hash,
          compare: jest.fn().mockResolvedValue(true),
        },
        { issue } as unknown as JwtTokenService,
      );

      // Act
      const response = await service.login(loginDto);

      // Assert
      expect(findByEmailForAuthentication).toHaveBeenCalledWith(
        'Nimali@Example.com',
      );
      expect(issue).toHaveBeenCalledWith(guest.guestId);
      expect(response).toMatchObject({
        accessToken: 'signed-token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        guest: {
          guestId: guest.guestId,
          fullName: 'Nimali Perera',
          email: 'nimali@example.com',
        },
      });
      expect(JSON.stringify(response)).not.toMatch(/password|bcrypt-hash/i);
    });

    it.each([
      ['wrong password', true],
      ['unknown email', false],
    ])('should reject login given %s', async (_scenario, guestExists) => {
      // Arrange
      const findByEmailForAuthentication = jest
        .fn()
        .mockResolvedValue(guestExists ? guest : null);
      const passwordCompare = jest.fn().mockResolvedValue(false);
      service = new GuestsService(
        { create, findByEmailForAuthentication } as unknown as GuestRepository,
        {
          hash,
          compare: passwordCompare,
        },
        { issue } as unknown as JwtTokenService,
      );

      // Act
      const result = service.login(loginDto);

      // Assert
      await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(result).rejects.toMatchObject({
        response: {
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
      expect(issue).not.toHaveBeenCalled();
      expect(passwordCompare).toHaveBeenCalledTimes(guestExists ? 1 : 0);
    });
  });

  describe('getAuthenticatedGuest', () => {
    it('should return the profile given an existing guest id', async () => {
      // Arrange
      const findById = jest.fn().mockResolvedValue({ guestId: 'guest-1' });
      service = new GuestsService(
        { create, findById } as unknown as GuestRepository,
        { hash, compare },
        { issue } as unknown as JwtTokenService,
      );

      // Act
      const guest = await service.getAuthenticatedGuest('guest-1');

      // Assert
      expect(guest.guestId).toBe('guest-1');
      expect(findById).toHaveBeenCalledWith('guest-1');
    });

    it('should reject an authenticated token for a deleted guest', async () => {
      // Arrange
      const findById = jest.fn().mockResolvedValue(null);
      service = new GuestsService(
        { create, findById } as unknown as GuestRepository,
        { hash, compare },
        { issue } as unknown as JwtTokenService,
      );

      // Act
      const result = service.getAuthenticatedGuest('guest-1');

      // Assert
      await expect(result).rejects.toMatchObject({
        response: {
          error: 'UNAUTHORIZED',
        },
      });
    });
  });
});
