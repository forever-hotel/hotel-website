import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DatabaseConfig } from '../config/configuration';
import { DatabaseService } from './database.service';
import { buildPostgresOptions } from './typeorm-options';

export function buildTypeOrmOptions(
  database: DatabaseConfig,
): TypeOrmModuleOptions {
  return {
    ...buildPostgresOptions(database),
    // Entities are registered per feature module via TypeOrmModule.forFeature().
    autoLoadEntities: true,
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
