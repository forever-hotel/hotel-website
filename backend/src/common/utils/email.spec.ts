import { normalizeEmail } from './email';

describe('normalizeEmail', () => {
  it('should trim and lowercase given a mixed-case email with spaces', () => {
    // Act
    const email = normalizeEmail('  Guest.Name@Example.COM ');

    // Assert
    expect(email).toBe('guest.name@example.com');
  });
});
