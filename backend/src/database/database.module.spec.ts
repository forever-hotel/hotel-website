import { join } from 'path';
import { DatabaseConfig } from '../config/configuration';
import { buildTypeOrmOptions } from './database.module';

const baseConfig: DatabaseConfig = {
  host: 'localhost',
  port: 5432,
  username: 'hotel_user',
  password: 'secret',
  name: 'hotel_db',
  ssl: false,
  synchronize: false,
  logging: false,
  migrationsTableName: 'hotel_website_migrations',
};

describe('buildTypeOrmOptions', () => {
  it('should map the database config to PostgreSQL options', () => {
    // Act
    const options = buildTypeOrmOptions(baseConfig);

    // Assert
    expect(options).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'hotel_user',
      password: 'secret',
      database: 'hotel_db',
      autoLoadEntities: true,
      connectTimeoutMS: 10000,
      synchronize: false,
      logging: false,
      ssl: false,
      migrationsTableName: 'hotel_website_migrations',
    });
  });

  it('should load migrations from database/migrations', () => {
    // Act
    const options = buildTypeOrmOptions(baseConfig);

    // Assert
    expect(options.migrations).toEqual([
      join(__dirname, 'migrations', '*.{ts,js}'),
    ]);
  });

  it('should require a verified TLS certificate given SSL is enabled', () => {
    // Act
    const options = buildTypeOrmOptions({ ...baseConfig, ssl: true });

    // Assert
    expect(options).toMatchObject({ ssl: { rejectUnauthorized: true } });
  });
});
