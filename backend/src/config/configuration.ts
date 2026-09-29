import { LogFormat, NodeEnvironment } from './constants';
import { validateEnv } from './env.validation';

export interface AppConfig {
  serviceName: string;
  nodeEnv: NodeEnvironment;
  port: number;
  logFormat: LogFormat;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: boolean;
  synchronize: boolean;
  logging: boolean;
  /** Per-service migrations table, because all subsystems share one database (SDS 1.5.2). */
  migrationsTableName: string;
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
}

export default function configuration(): Configuration {
  const env = validateEnv(process.env);

  return {
    app: {
      serviceName: env.SERVICE_NAME,
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      logFormat: env.LOG_FORMAT,
    },
    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      name: env.DB_NAME,
      ssl: env.DB_SSL,
      synchronize: env.DB_SYNCHRONIZE,
      logging: env.DB_LOGGING,
      migrationsTableName: `${env.SERVICE_NAME.replace(/-/g, '_')}_migrations`,
    },
  };
}
