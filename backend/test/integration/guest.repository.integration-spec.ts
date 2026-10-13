import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { GuestRepository } from '../../src/database/repositories/guest.repository';
import { Guest } from '../../src/guests/entities/guest.entity';
import { EmailAlreadyRegisteredError } from '../../src/guests/errors/email-already-registered.error';

// Requires a database created from database/infra-schema/ (DB_* variables).
// Uses unique test emails and deletes only the rows it created.
describe('GuestRepository (integration)', () => {
  let app: INestApplication;
  let guests: GuestRepository;
  let dataSource: DataSource;
  const createdIds: string[] = [];

  const testEmail = () => `it-${randomUUID()}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    guests = app.get(GuestRepository);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await dataSource.getRepository(Guest).delete(createdIds);
    }
    await app.close();
  });

  it('should save a guest with a lowercase email and find it in any case', async () => {
    // Arrange
    const email = testEmail();

    // Act
    const created = await guests.create({
      fullName: 'Integration Guest',
      email: email.toUpperCase(),
      passwordHash: '$2b$12$integration.test.hash.only',
    });
    createdIds.push(created.guestId);
    const found = await guests.findByEmail(` ${email.toUpperCase()} `);

    // Assert
    expect(created.email).toBe(email);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(found).toMatchObject({
      guestId: created.guestId,
      fullName: 'Integration Guest',
      email,
      phone: null,
      nicOrPassport: null,
    });
  });

  it('should never return the password hash given a guest is read back', async () => {
    // Arrange
    const created = await guests.create({
      fullName: 'Integration Guest',
      email: testEmail(),
      passwordHash: '$2b$12$integration.test.hash.only',
    });
    createdIds.push(created.guestId);

    // Act
    const found = await guests.findById(created.guestId);

    // Assert
    expect(created.passwordHash).toBeUndefined();
    expect(found?.passwordHash).toBeUndefined();
  });

  it('should reject a second account given the same email in a different case', async () => {
    // Arrange
    const email = testEmail();
    const first = await guests.create({
      fullName: 'Integration Guest',
      email,
      passwordHash: '$2b$12$integration.test.hash.only',
    });
    createdIds.push(first.guestId);

    // Act
    const second = guests.create({
      fullName: 'Another Guest',
      email: email.toUpperCase(),
      passwordHash: '$2b$12$integration.test.hash.only',
    });

    // Assert
    await expect(second).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it('should return null given an email with no account', async () => {
    // Act & Assert
    await expect(guests.findByEmail(testEmail())).resolves.toBeNull();
  });
});
