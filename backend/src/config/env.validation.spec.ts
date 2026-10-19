import { validateEnv } from './env.validation';

const validEnv = (): Record<string, string | undefined> => ({
  DB_HOST: 'localhost',
  DB_USERNAME: 'hotel_user',
  DB_PASSWORD: 'super-secret-value',
  DB_NAME: 'hotel_db',
  JWT_SECRET: 'test-jwt-secret-with-at-least-32-bytes',
  JWT_ISSUER: 'hotel-website',
});

describe('validateEnv', () => {
  it('should apply safe defaults given only the required variables', () => {
    // Arrange
    const raw = validEnv();

    // Act
    const env = validateEnv(raw);

    // Assert
    expect(env).toEqual({
      SERVICE_NAME: 'hotel-website',
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_FORMAT: 'text',
      LOG_LEVEL: 'debug',
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_USERNAME: 'hotel_user',
      DB_PASSWORD: 'super-secret-value',
      DB_NAME: 'hotel_db',
      DB_SSL: false,
      DB_SYNCHRONIZE: false,
      DB_LOGGING: false,
      JWT_SECRET: 'test-jwt-secret-with-at-least-32-bytes',
      JWT_ISSUER: 'hotel-website',
    });
  });

  it('should parse ports and booleans given explicit values', () => {
    // Arrange
    const raw = {
      ...validEnv(),
      NODE_ENV: 'production',
      PORT: '8080',
      LOG_FORMAT: 'json',
      DB_PORT: '6543',
      DB_SSL: 'TRUE',
      DB_LOGGING: 'true',
    };

    // Act
    const env = validateEnv(raw);

    // Assert
    expect(env).toMatchObject({
      NODE_ENV: 'production',
      PORT: 8080,
      LOG_FORMAT: 'json',
      DB_PORT: 6543,
      DB_SSL: true,
      DB_LOGGING: true,
    });
  });

  it('should list every missing required variable given an empty environment', () => {
    // Act & Assert
    expect(() => validateEnv({})).toThrow(
      /DB_HOST is not defined[\s\S]*DB_USERNAME is not defined[\s\S]*DB_PASSWORD is not defined[\s\S]*DB_NAME is not defined[\s\S]*JWT_SECRET is not defined[\s\S]*JWT_ISSUER is not defined/,
    );
  });

  it('should treat whitespace-only values as missing', () => {
    // Arrange
    const raw = { ...validEnv(), DB_HOST: '   ' };

    // Act & Assert
    expect(() => validateEnv(raw)).toThrow('DB_HOST is not defined');
  });

  it('should reject a JWT secret shorter than 32 bytes', () => {
    expect(() =>
      validateEnv({ ...validEnv(), JWT_SECRET: 'too-short' }),
    ).toThrow('JWT_SECRET must be at least 32 bytes');
  });

  it.each(['0', '65536', 'abc', '54.3'])(
    'should reject DB_PORT given the out-of-range or non-integer value %s',
    (port) => {
      // Arrange
      const raw = { ...validEnv(), DB_PORT: port };

      // Act & Assert
      expect(() => validateEnv(raw)).toThrow(
        'DB_PORT must be an integer between 1 and 65535',
      );
    },
  );

  it('should reject a boolean flag given a value other than true or false', () => {
    // Arrange
    const raw = { ...validEnv(), DB_SSL: 'yes' };

    // Act & Assert
    expect(() => validateEnv(raw)).toThrow('DB_SSL must be "true" or "false"');
  });

  it.each([
    ['development', 'debug'],
    ['test', 'warn'],
    ['production', 'warn'],
  ])('should default LOG_LEVEL given NODE_ENV=%s', (nodeEnv, expectedLevel) => {
    // Act
    const env = validateEnv({ ...validEnv(), NODE_ENV: nodeEnv });

    // Assert
    expect(env.LOG_LEVEL).toBe(expectedLevel);
  });

  it('should use an explicit LOG_LEVEL given a valid value', () => {
    // Act
    const env = validateEnv({
      ...validEnv(),
      NODE_ENV: 'production',
      LOG_LEVEL: 'verbose',
    });

    // Assert
    expect(env.LOG_LEVEL).toBe('verbose');
  });

  it('should reject an unknown LOG_LEVEL value', () => {
    // Arrange
    const raw = { ...validEnv(), LOG_LEVEL: 'trace' };

    // Act & Assert
    expect(() => validateEnv(raw)).toThrow(
      'LOG_LEVEL must be one of: verbose, debug, log, warn, error',
    );
  });

  it('should reject a connection URL in DB_HOST without printing it', () => {
    // Arrange
    const raw = {
      ...validEnv(),
      DB_HOST: 'postgresql://user:leaked-secret@ep-example.neon.tech/db',
    };

    // Act & Assert
    expect(() => validateEnv(raw)).toThrow(
      'DB_HOST must be a host name only (e.g. ep-xxx.neon.tech), not a connection URL',
    );
    expect(() => validateEnv(raw)).not.toThrow(/leaked-secret/);
  });

  it('should reject unknown NODE_ENV and LOG_FORMAT values', () => {
    // Arrange
    const raw = { ...validEnv(), NODE_ENV: 'staging', LOG_FORMAT: 'xml' };

    // Act & Assert
    expect(() => validateEnv(raw)).toThrow(
      /NODE_ENV must be one of: development, test, production[\s\S]*LOG_FORMAT must be one of: text, json/,
    );
  });

  it('should refuse DB_SYNCHRONIZE given a production environment', () => {
    // Arrange
    const raw = {
      ...validEnv(),
      NODE_ENV: 'production',
      DB_SYNCHRONIZE: 'true',
    };

    // Act & Assert
    expect(() => validateEnv(raw)).toThrow(
      'DB_SYNCHRONIZE must not be true when NODE_ENV is production',
    );
  });

  it('should never include secret values in the error message', () => {
    // Arrange
    const raw = { ...validEnv(), DB_PORT: 'not-a-port' };

    // Act
    let message = '';
    try {
      validateEnv(raw);
    } catch (error) {
      message = (error as Error).message;
    }

    // Assert
    expect(message).not.toContain('super-secret-value');
    expect(message).not.toContain('not-a-port');
  });

  it('should use the configured SERVICE_NAME given a valid kebab-case name', () => {
    // Arrange
    const raw = { ...validEnv(), SERVICE_NAME: 'front-desk' };

    // Act
    const env = validateEnv(raw);

    // Assert
    expect(env.SERVICE_NAME).toBe('front-desk');
  });

  it.each(['Front_Desk', 'x', 'kitchen-', 'has space'])(
    'should reject SERVICE_NAME given the invalid value %s',
    (name) => {
      // Arrange
      const raw = { ...validEnv(), SERVICE_NAME: name };

      // Act & Assert
      expect(() => validateEnv(raw)).toThrow(
        'SERVICE_NAME must be lowercase kebab-case',
      );
    },
  );
});
