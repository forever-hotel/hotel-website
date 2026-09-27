import { existsSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import configuration from '../config/configuration';
import { buildPostgresOptions } from './typeorm-options';

/**
 * Data source used only by the TypeORM CLI (npm run migration:*).
 * The Nest application connects through DatabaseModule instead.
 */
const envFile = join(__dirname, '..', '..', '.env');
if (existsSync(envFile)) {
  // Local runs read backend/.env; containers and CI pass real environment variables.
  process.loadEnvFile(envFile);
}

const { database } = configuration();

export default new DataSource({
  ...buildPostgresOptions(database),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
});
