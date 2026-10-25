import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtTokenService } from '../common/utils/jwt-token.service';
import { JWT_EXPIRES_IN_SECONDS } from '../config/constants';
import { GuestRepository } from '../database/repositories/guest.repository';
import { GuestAuthResponseDto } from './dto/guest-auth-response.dto';
import { GuestResponseDto } from './dto/guest-response.dto';
import { LoginGuestDto } from './dto/login-guest.dto';
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
    private readonly jwtTokenService: JwtTokenService,
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

  async login(dto: LoginGuestDto): Promise<GuestAuthResponseDto> {
    const guest = await this.guestRepository.findByEmailForAuthentication(
      dto.email,
    );
    const passwordMatches = guest?.passwordHash
      ? await this.passwordHasher.compare(dto.password, guest.passwordHash)
      : false;

    if (!guest || !passwordMatches) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    return Object.assign(new GuestAuthResponseDto(), {
      accessToken: this.jwtTokenService.issue(guest.guestId),
      tokenType: 'Bearer' as const,
      expiresIn: JWT_EXPIRES_IN_SECONDS,
      guest: GuestResponseDto.fromGuest(guest),
    });
  }

  async getAuthenticatedGuest(guestId: string): Promise<Guest> {
    const guest = await this.guestRepository.findById(guestId);
    if (!guest) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'The authenticated guest account is no longer available.',
      });
    }
    return guest;
  }
}
