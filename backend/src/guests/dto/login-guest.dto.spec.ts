import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginGuestDto } from './login-guest.dto';

const validInput = () => ({
  email: 'nimali@example.com',
  password: 'a long passphrase',
});

async function invalidFields(input: object): Promise<string[]> {
  const dto = plainToInstance(LoginGuestDto, input);
  const errors = await validate(dto);
  return errors.map((error) => error.property);
}

describe('LoginGuestDto', () => {
  it('should accept valid email and password', async () => {
    await expect(invalidFields(validInput())).resolves.toEqual([]);
  });

  it('should trim surrounding whitespace from the email', () => {
    const dto = plainToInstance(LoginGuestDto, {
      ...validInput(),
      email: ' nimali@example.com ',
    });

    expect(dto.email).toBe('nimali@example.com');
  });

  it('should reject an invalid email', async () => {
    await expect(
      invalidFields({ ...validInput(), email: 'not-an-email' }),
    ).resolves.toEqual(['email']);
  });

  it('should reject a password longer than the bcrypt byte limit', async () => {
    await expect(
      invalidFields({ ...validInput(), password: 'a'.repeat(73) }),
    ).resolves.toEqual(['password']);
  });

  it('should report all missing fields given an empty body', async () => {
    await expect(invalidFields({})).resolves.toEqual(['email', 'password']);
  });
});
