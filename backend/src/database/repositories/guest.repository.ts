import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeEmail } from '../../common/utils/email';
import { Guest } from '../../guests/entities/guest.entity';
import { EmailAlreadyRegisteredError } from '../../guests/errors/email-already-registered.error';
import { CreateGuestData } from '../../guests/interfaces/create-guest-data.interface';
import { isUniqueViolation } from '../postgres-errors';

/** Data access for the shared `guests` table. Returned guests never include the password hash. */
@Injectable()
export class GuestRepository {
  constructor(
    @InjectRepository(Guest) private readonly guests: Repository<Guest>,
  ) {}

  /**
   * Creates a guest account with a normalised email.
   * @throws EmailAlreadyRegisteredError when the email is already registered.
   */
  async create(data: CreateGuestData): Promise<Guest> {
    const values = {
      fullName: data.fullName,
      email: normalizeEmail(data.email),
      phone: data.phone ?? null,
      nicOrPassport: null,
    };
    try {
      const result = await this.guests
        .createQueryBuilder()
        .insert()
        .into(Guest)
        .values({ ...values, passwordHash: data.passwordHash })
        .execute();
      // PostgreSQL returns the generated id and timestamps for the new row.
      const [generated] = result.generatedMaps as Partial<Guest>[];
      return Object.assign(new Guest(), values, generated);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<Guest | null> {
    return this.guests
      .createQueryBuilder('guest')
      .where('guest.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  findById(guestId: string): Promise<Guest | null> {
    return this.guests
      .createQueryBuilder('guest')
      .where('guest.guestId = :guestId', { guestId })
      .getOne();
  }
}
