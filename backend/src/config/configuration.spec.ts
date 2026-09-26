import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      DB_HOST: 'ep-example.ap-southeast-1.aws.neon.tech',
      DB_USERNAME: 'hotel_user',
      DB_PASSWORD: 'secret',
      DB_NAME: 'hotel_db',
      DB_SSL: 'true',
      PORT: '4000',
      SERVICE_NAME: 'front-desk',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should group validated variables into app and database sections', () => {
    // Act
    const config = configuration();

    // Assert
    expect(config).toEqual({
      app: {
        serviceName: 'front-desk',
        nodeEnv: 'development',
        port: 4000,
        logFormat: 'text',
      },
      database: {
        host: 'ep-example.ap-southeast-1.aws.neon.tech',
        port: 5432,
        username: 'hotel_user',
        password: 'secret',
        name: 'hotel_db',
        ssl: true,
        synchronize: false,
        logging: false,
        migrationsTableName: 'front_desk_migrations',
      },
    });
  });

  it('should fail fast given invalid environment variables', () => {
    // Arrange
    delete process.env.DB_HOST;

    // Act & Assert
    expect(() => configuration()).toThrow('DB_HOST is not defined');
  });
});
