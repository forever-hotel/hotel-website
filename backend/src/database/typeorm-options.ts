import { join } from 'path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { DatabaseConfig } from '../config/configuration';
import { DB_CONNECT_TIMEOUT_MS } from '../config/constants';

/**
 * Connection options shared by the Nest application (DatabaseModule) and the
 * TypeORM migrations CLI (data-source.ts), so both always connect the same way.
 */
export function buildPostgresOptions(
  database: DatabaseConfig,
): PostgresConnectionOptions {
  return {
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.name,
    // Cloud providers such as Neon require TLS; verify the server certificate.
    ssl: database.ssl ? { rejectUnauthorized: true } : false,
    connectTimeoutMS: DB_CONNECT_TIMEOUT_MS,
    // Only enable on a disposable development database; use migrations otherwise (NFR-16).
    synchronize: database.synchronize,
    logging: database.logging,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: database.migrationsTableName,
  };
}
