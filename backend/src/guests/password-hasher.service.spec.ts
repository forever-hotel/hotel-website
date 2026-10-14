import { compare, getRounds } from 'bcryptjs';
import { BCRYPT_COST } from '../config/constants';
import { PasswordHasher } from './password-hasher.service';

describe('PasswordHasher', () => {
  it('should return a bcrypt hash with the configured cost that matches the password', async () => {
    // Arrange
    const hasher = new PasswordHasher();

    // Act
    const hashed = await hasher.hash('a long passphrase');

    // Assert
    expect(hashed).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hashed).not.toContain('a long passphrase');
    expect(getRounds(hashed)).toBe(BCRYPT_COST);
    await expect(compare('a long passphrase', hashed)).resolves.toBe(true);
    await expect(compare('wrong password', hashed)).resolves.toBe(false);
  });
});
