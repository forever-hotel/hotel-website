import { QueryFailedError, Repository } from 'typeorm';
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

  const newGuest = {
    fullName: 'Nimali Perera',
    email: ' Nimali@Example.com ',
    passwordHash: 'bcrypt-hash',
  };

  beforeEach(() => {
    queryBuilder = createQueryBuilderMock();
    createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
    repository = new GuestRepository({
      createQueryBuilder,
    } as unknown as Repository<Guest>);
  });

  describe('create', () => {
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

    it('should throw EmailAlreadyRegisteredError given the email already exists', async () => {
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
    });

    it('should rethrow the original error given any other database failure', async () => {
      // Arrange
      const failure = new Error('connection lost');
      queryBuilder.execute.mockRejectedValue(failure);

      // Act
      const result = repository.create(newGuest);

      // Assert
      await expect(result).rejects.toBe(failure);
    });
  });

  it('should search a normalised email with a bound parameter given findByEmail is called', async () => {
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
  });

  it('should search by guest id with a bound parameter given findById is called', async () => {
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
  });
});
