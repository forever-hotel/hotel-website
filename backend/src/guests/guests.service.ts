import { ConflictException, Injectable } from '@nestjs/common';
import { GuestRepository } from '../database/repositories/guest.repository';
import { RegisterGuestDto } from './dto/register-guest.dto';
import { Guest } from './entities/guest.entity';
import { EmailAlreadyRegisteredError } from './errors/email-already-registered.error';
import { PasswordHasher } from './password-hasher.service';

export const EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED';

/** Guest account rules: registration (HW-06). */
@Injectable()
export class GuestsService {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  /**
   * Creates a guest account; the password is stored only as a bcrypt hash.
   * @throws ConflictException (409 EMAIL_ALREADY_REGISTERED) for a used email.
   */
  async register(dto: RegisterGuestDto): Promise<Guest> {
    const passwordHash = await this.passwordHasher.hash(dto.password);
    try {
      return await this.guestRepository.create({
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
      });
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        throw new ConflictException({
          error: EMAIL_ALREADY_REGISTERED,
          message: 'An account with this email already exists.',
        });
      }
      throw error;
    }
  }
}
