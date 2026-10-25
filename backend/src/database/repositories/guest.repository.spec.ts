import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import {
  allLoggedText,
  LoggerSpies,
  spyOnLogger,
} from '../../../test/unit/logger.spy';
import {
  createQueryBuilderMock,
  QueryBuilderMock,
} from '../../../test/unit/query-builder.mock';
import { Guest } from '../../guests/entities/guest.entity';
import { EmailAlreadyRegisteredError } from '../../guests/errors/email-already-registered.error';
import { GuestRepository } from './guest.repository';

describe('GuestRepository', () => {
  let queryBuilder: QueryBuilderMock;
  let createQueryBuilder: jest.Mock;
  let repository: GuestRepository;
  let logs: LoggerSpies;
  let query: jest.Mock;
  let transaction: jest.Mock;

  const newGuest = {
    fullName: 'Nimali Perera',
    email: ' Nimali@Example.com ',
    passwordHash: 'bcrypt-hash',
  };

  beforeEach(() => {
    logs = spyOnLogger();
    queryBuilder = createQueryBuilderMock();
    createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
    query = jest.fn().mockResolvedValue([]);
    const manager = { query, getRepository: () => ({ createQueryBuilder }) };
    transaction = jest.fn(
      (_isolation: string, callback: (manager: EntityManager) => unknown) =>
        callback(manager as unknown as EntityManager),
    );
    repository = new GuestRepository({
      createQueryBuilder,
      manager: { transaction },
    } as unknown as Repository<Guest>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('rejects an existing email without relying on a database unique index', async () => {
      query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ exists: 1 }]);
      await expect(repository.create(newGuest)).rejects.toBeInstanceOf(
        EmailAlreadyRegisteredError,
      );
      expect(transaction).toHaveBeenCalledWith(
        'READ COMMITTED',
        expect.any(Function),
      );
      expect(query).toHaveBeenNthCalledWith(
        1,
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        ['hw-guest-email:nimali@example.com'],
      );
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('lower(btrim(email)) = $1'),
        ['nimali@example.com'],
      );
      expect(queryBuilder.execute).not.toHaveBeenCalled();
    });
    it('should insert a normalised email and return the guest without the hash given new details', async () => {
      // Arrange
      const createdAt = new Date('2026-10-13T08:00:00Z');
      queryBuilder.execute.mockResolvedValue({
        generatedMaps: [
          { guestId: 'guest-1', createdAt, updatedAt: createdAt },
        ],
      });

      // Act
      const guest = await repository.create(newGuest);

      // Assert
      expect(queryBuilder.into).toHaveBeenCalledWith(Guest);
      expect(queryBuilder.values).toHaveBeenCalledWith({
        fullName: 'Nimali Perera',
        email: 'nimali@example.com',
        phone: null,
        nicOrPassport: null,
        passwordHash: 'bcrypt-hash',
      });
      expect(guest).toBeInstanceOf(Guest);
      expect(guest).toEqual({
        guestId: 'guest-1',
        fullName: 'Nimali Perera',
        email: 'nimali@example.com',
        phone: null,
        nicOrPassport: null,
        createdAt,
        updatedAt: createdAt,
      });
      expect(guest.passwordHash).toBeUndefined();
    });

    it('should log the new guest id without personal data given the insert succeeds', async () => {
      // Arrange
      queryBuilder.execute.mockResolvedValue({
        generatedMaps: [{ guestId: 'guest-1' }],
      });

      // Act
      await repository.create({ ...newGuest, phone: '+94771234567' });

      // Assert
      expect(logs.log).toHaveBeenCalledWith('Guest account created: guest-1');
      const logged = allLoggedText(logs);
      expect(logged).not.toMatch(/nimali|perera|94771234567|bcrypt-hash/i);
    });

    it('should keep the phone number given one is provided', async () => {
      // Arrange
      queryBuilder.execute.mockResolvedValue({ generatedMaps: [{}] });

      // Act
      await repository.create({ ...newGuest, phone: '+94771234567' });

      // Assert
      expect(queryBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+94771234567' }),
      );
    });

    it('should throw EmailAlreadyRegisteredError and warn given the email already exists', async () => {
      // Arrange
      queryBuilder.execute.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), { code: '23505' }),
        ),
      );

      // Act
      const result = repository.create(newGuest);

      // Assert
      await expect(result).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
      expect(logs.warn).toHaveBeenCalledWith(
        'Guest account not created: email already registered',
      );
      expect(logs.error).not.toHaveBeenCalled();
    });

    it('should log the error name and rethrow given any other database failure', async () => {
      // Arrange
      const failure = new Error('connect failed for nimali@example.com');
      queryBuilder.execute.mockRejectedValue(failure);

      // Act
      const result = repository.create(newGuest);

      // Assert
      await expect(result).rejects.toBe(failure);
      expect(logs.error).toHaveBeenCalledWith(
        'Inserting guest account failed: Error',
      );
      expect(allLoggedText(logs)).not.toContain('nimali');
    });
  });

  describe('findByEmail', () => {
    it('should search a normalised email with a bound parameter', async () => {
      // Arrange
      queryBuilder.getOne.mockResolvedValue(null);

      // Act
      const guest = await repository.findByEmail(' Nimali@Example.com');

      // Assert
      expect(guest).toBeNull();
      expect(createQueryBuilder).toHaveBeenCalledWith('guest');
      expect(queryBuilder.where).toHaveBeenCalledWith('guest.email = :email', {
        email: 'nimali@example.com',
      });
      expect(logs.debug).toHaveBeenCalledWith('No guest found for email');
    });

    describe('findByEmailForAuthentication', () => {
      it('refuses ambiguous authentication when legacy duplicate emails exist', async () => {
        queryBuilder.getMany.mockResolvedValue([
          { guestId: 'first' },
          { guestId: 'second' },
        ]);
        expect(
          await repository.findByEmailForAuthentication(' Nimali@Example.com '),
        ).toBeNull();
        expect(queryBuilder.limit).toHaveBeenCalledWith(2);
      });
      it('returns null when no account exists', async () => {
        queryBuilder.getMany.mockResolvedValue([]);
        expect(
          await repository.findByEmailForAuthentication(
            'missing@example.invalid',
          ),
        ).toBeNull();
      });
      it('should select the password hash and normalize the email given login lookup', async () => {
        // Arrange
        const stored = { guestId: 'guest-1', passwordHash: 'bcrypt-hash' };
        queryBuilder.getMany.mockResolvedValue([stored]);

        // Act
        const guest = await repository.findByEmailForAuthentication(
          ' Nimali@Example.com ',
        );

        // Assert
        expect(guest).toBe(stored);
        expect(queryBuilder.addSelect).toHaveBeenCalledWith(
          'guest.passwordHash',
        );
        expect(queryBuilder.where).toHaveBeenCalledWith(
          'lower(btrim(guest.email)) = :email',
          {
            email: 'nimali@example.com',
          },
        );
        expect(allLoggedText(logs)).not.toContain('nimali@example.com');
      });

      it('should log the error name and rethrow given the login lookup fails', async () => {
        // Arrange
        const failure = new TypeError('broken');
        queryBuilder.getMany.mockRejectedValue(failure);

        // Act
        const result =
          repository.findByEmailForAuthentication('nimali@example.com');

        // Assert
        await expect(result).rejects.toBe(failure);
        expect(logs.error).toHaveBeenCalledWith(
          'Finding guest for authentication failed: TypeError',
        );
        expect(allLoggedText(logs)).not.toContain('nimali@example.com');
      });
    });

    it('should log only the guest id given a guest is found', async () => {
      // Arrange
      queryBuilder.getOne.mockResolvedValue({ guestId: 'guest-1' });

      // Act
      await repository.findByEmail('nimali@example.com');

      // Assert
      expect(logs.debug).toHaveBeenCalledWith('Guest found by email: guest-1');
      expect(allLoggedText(logs)).not.toContain('nimali');
    });

    it('should log the error name and rethrow given the query fails', async () => {
      // Arrange
      const failure = new TypeError('broken');
      queryBuilder.getOne.mockRejectedValue(failure);

      // Act
      const result = repository.findByEmail('nimali@example.com');

      // Assert
      await expect(result).rejects.toBe(failure);
      expect(logs.error).toHaveBeenCalledWith(
        'Finding guest by email failed: TypeError',
      );
    });
  });

  describe('findById', () => {
    it('should search by guest id with a bound parameter', async () => {
      // Arrange
      const stored = { guestId: 'guest-1' } as Guest;
      queryBuilder.getOne.mockResolvedValue(stored);

      // Act
      const guest = await repository.findById('guest-1');

      // Assert
      expect(guest).toBe(stored);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'guest.guestId = :guestId',
        { guestId: 'guest-1' },
      );
      expect(logs.debug).toHaveBeenCalledWith('Guest found: guest-1');
    });

    it('should log a debug message given no guest has the id', async () => {
      // Arrange
      queryBuilder.getOne.mockResolvedValue(null);

      // Act
      await repository.findById('guest-404');

      // Assert
      expect(logs.debug).toHaveBeenCalledWith('Guest not found: guest-404');
    });

    it('should log the error name and rethrow given the query fails', async () => {
      // Arrange
      const failure = new Error('broken');
      queryBuilder.getOne.mockRejectedValue(failure);

      // Act
      const result = repository.findById('guest-1');

      // Assert
      await expect(result).rejects.toBe(failure);
      expect(logs.error).toHaveBeenCalledWith(
        'Finding guest guest-1 failed: Error',
      );
    });
  });
});
