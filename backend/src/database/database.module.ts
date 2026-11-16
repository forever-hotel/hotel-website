import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DatabaseConfig } from '../config/configuration';
import { DB_CONNECT_TIMEOUT_MS } from '../config/constants';
import { DatabaseService } from './database.service';

/**
 * Connects to the shared PostgreSQL database. Tables are created and changed
 * only by migrations in forever-hotel/infra; this service maps entities onto
 * the existing tables and never alters the schema.
 */
export function buildTypeOrmOptions(
  database: DatabaseConfig,
): TypeOrmModuleOptions {
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
    // Entities are registered per feature module via TypeOrmModule.forFeature().
    autoLoadEntities: true,
    // Keep false on the shared database: the schema belongs to forever-hotel/infra.
    synchronize: database.synchronize,
    logging: database.logging,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildTypeOrmOptions(
          configService.getOrThrow<DatabaseConfig>('database'),
        ),
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
