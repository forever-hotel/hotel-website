import { ConflictException } from '@nestjs/common';
import { GuestRepository } from '../database/repositories/guest.repository';
import { RegisterGuestDto } from './dto/register-guest.dto';
import { Guest } from './entities/guest.entity';
import { EmailAlreadyRegisteredError } from './errors/email-already-registered.error';
import { GuestsService } from './guests.service';

describe('GuestsService', () => {
  let create: jest.Mock;
  let hash: jest.Mock;
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
    service = new GuestsService({ create } as unknown as GuestRepository, {
      hash,
    });
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
});
