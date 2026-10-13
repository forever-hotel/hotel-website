import { AppLogLevel, LogFormat, NodeEnvironment } from './constants';
import { validateEnv } from './env.validation';

export interface AppConfig {
  serviceName: string;
  nodeEnv: NodeEnvironment;
  port: number;
  logFormat: LogFormat;
  logLevel: AppLogLevel;
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
      logLevel: env.LOG_LEVEL,
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
    },
  };
}
