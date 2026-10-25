import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeEmail } from '../../common/utils/email';
import { errorName } from '../../common/utils/error-name';
import { Guest } from '../../guests/entities/guest.entity';
import { EmailAlreadyRegisteredError } from '../../guests/errors/email-already-registered.error';
import { CreateGuestData } from '../../guests/interfaces/create-guest-data.interface';
import { isUniqueViolation } from '../postgres-errors';

/**
 * Data access for the shared `guests` table. Returned guests never include the
 * password hash. Logs use guest UUIDs only, never names, emails or phones.
 */
@Injectable()
export class GuestRepository {
  private readonly logger = new Logger(GuestRepository.name);

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
    this.logger.verbose('Inserting guest account');
    try {
      const result = await this.guests.manager.transaction(
        'READ COMMITTED',
        async (manager) => {
          // Protect registrations through this service even if the shared database
          // is missing its email uniqueness constraint. The lock spans check+insert.
          await manager.query(
            'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
            [`hw-guest-email:${values.email}`],
          );
          const existing = await manager.query<{ exists: number }[]>(
            'SELECT 1 AS exists FROM guests WHERE lower(btrim(email)) = $1 LIMIT 1',
            [values.email],
          );
          if (existing.length) throw new EmailAlreadyRegisteredError();
          return manager
            .getRepository(Guest)
            .createQueryBuilder()
            .insert()
            .into(Guest)
            .values({ ...values, passwordHash: data.passwordHash })
            .execute();
        },
      );
      // PostgreSQL returns the generated id and timestamps for the new row.
      const [generated] = result.generatedMaps as Partial<Guest>[];
      const guest = Object.assign(new Guest(), values, generated);
      this.logger.log(`Guest account created: ${guest.guestId}`);
      return guest;
    } catch (error) {
      if (
        error instanceof EmailAlreadyRegisteredError ||
        isUniqueViolation(error)
      ) {
        this.logger.warn('Guest account not created: email already registered');
        throw new EmailAlreadyRegisteredError();
      }
      this.logger.error(`Inserting guest account failed: ${errorName(error)}`);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Guest | null> {
    this.logger.verbose('Finding guest by email');
    try {
      const guest = await this.guests
        .createQueryBuilder('guest')
        .where('guest.email = :email', { email: normalizeEmail(email) })
        .getOne();
      this.logger.debug(
        guest
          ? `Guest found by email: ${guest.guestId}`
          : 'No guest found for email',
      );
      return guest;
    } catch (error) {
      this.logger.error(`Finding guest by email failed: ${errorName(error)}`);
      throw error;
    }
  }

  async findByEmailForAuthentication(email: string): Promise<Guest | null> {
    this.logger.verbose('Finding guest for authentication');
    try {
      const matches = await this.guests
        .createQueryBuilder('guest')
        .addSelect('guest.passwordHash')
        .where('lower(btrim(guest.email)) = :email', {
          email: normalizeEmail(email),
        })
        .limit(2)
        .getMany();
      // Existing duplicates must be reviewed by the data owner, not selected
      // arbitrarily when authenticating someone.
      const guest = matches.length === 1 ? matches[0] : null;
      this.logger.debug(
        guest
          ? `Guest found for authentication: ${guest.guestId}`
          : 'No guest found for authentication',
      );
      return guest;
    } catch (error) {
      this.logger.error(
        `Finding guest for authentication failed: ${errorName(error)}`,
      );
      throw error;
    }
  }

  async findById(guestId: string): Promise<Guest | null> {
    this.logger.verbose(`Finding guest ${guestId}`);
    try {
      const guest = await this.guests
        .createQueryBuilder('guest')
        .where('guest.guestId = :guestId', { guestId })
        .getOne();
      this.logger.debug(
        guest ? `Guest found: ${guestId}` : `Guest not found: ${guestId}`,
      );
      return guest;
    } catch (error) {
      this.logger.error(`Finding guest ${guestId} failed: ${errorName(error)}`);
      throw error;
    }
  }
}
