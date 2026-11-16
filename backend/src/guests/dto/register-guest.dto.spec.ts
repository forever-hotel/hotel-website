import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterGuestDto } from './register-guest.dto';

const validInput = () => ({
  fullName: 'Nimali Perera',
  email: 'nimali@example.com',
  password: 'a long passphrase',
});

/** Returns the names of the fields that failed validation. */
async function invalidFields(input: object): Promise<string[]> {
  const dto = plainToInstance(RegisterGuestDto, input);
  const errors = await validate(dto);
  return errors.map((error) => error.property);
}

describe('RegisterGuestDto', () => {
  it('should accept valid details given name, email and password', async () => {
    // Act & Assert
    await expect(invalidFields(validInput())).resolves.toEqual([]);
  });

  it('should trim the name and email given surrounding spaces', () => {
    // Act
    const dto = plainToInstance(RegisterGuestDto, {
      ...validInput(),
      fullName: '  Nimali Perera ',
      email: ' nimali@example.com ',
    });

    // Assert
    expect(dto.fullName).toBe('Nimali Perera');
    expect(dto.email).toBe('nimali@example.com');
  });

  it.each([
    ["O'Brien-Silva", 'apostrophes and hyphens'],
    ['සුනිල් පෙරේරා', 'Sinhala letters'],
    ['சுனில்', 'Tamil letters'],
  ])('should accept the name %s given %s', async (fullName) => {
    // Act & Assert
    await expect(invalidFields({ ...validInput(), fullName })).resolves.toEqual(
      [],
    );
  });

  it.each([
    ['Nimali123', 'digits'],
    ['<script>', 'symbols'],
    ['', 'an empty name'],
    ['a'.repeat(256), 'more than 255 characters'],
  ])('should reject the name given %s (%s)', async (fullName) => {
    // Act & Assert
    await expect(invalidFields({ ...validInput(), fullName })).resolves.toEqual(
      ['fullName'],
    );
  });

  it.each([['not-an-email'], [`${'a'.repeat(310)}@example.com`]])(
    'should reject the email %s',
    async (email) => {
      // Act & Assert
      await expect(invalidFields({ ...validInput(), email })).resolves.toEqual([
        'email',
      ]);
    },
  );

  it.each([
    ['short', 'fewer than 8 characters'],
    ['a'.repeat(73), 'more than 72 bytes'],
    ['é'.repeat(37), '74 bytes of accented letters'],
  ])('should reject the password given %s (%s)', async (password) => {
    // Act & Assert
    await expect(invalidFields({ ...validInput(), password })).resolves.toEqual(
      ['password'],
    );
  });

  it('should accept a password of exactly 8 and exactly 72 characters', async () => {
    // Act & Assert
    await expect(
      invalidFields({ ...validInput(), password: 'a'.repeat(8) }),
    ).resolves.toEqual([]);
    await expect(
      invalidFields({ ...validInput(), password: 'a'.repeat(72) }),
    ).resolves.toEqual([]);
  });

  it('should accept an optional phone given 10 to 15 digits', async () => {
    // Act & Assert
    await expect(
      invalidFields({ ...validInput(), phone: '+94771234567' }),
    ).resolves.toEqual([]);
  });

  it('should reject a phone given letters or too few digits', async () => {
    // Act & Assert
    await expect(
      invalidFields({ ...validInput(), phone: '077-123' }),
    ).resolves.toEqual(['phone']);
  });

  it('should report every missing required field given an empty body', async () => {
    // Act & Assert
    await expect(invalidFields({})).resolves.toEqual([
      'fullName',
      'email',
      'password',
    ]);
  });
});
