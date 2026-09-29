import {
  DEFAULT_APP_PORT,
  DEFAULT_DB_PORT,
  DEFAULT_SERVICE_NAME,
  LOG_FORMATS,
  LogFormat,
  NODE_ENVIRONMENTS,
  NodeEnvironment,
  SERVICE_NAME_PATTERN,
} from './constants';

export interface EnvironmentVariables {
  SERVICE_NAME: string;
  NODE_ENV: NodeEnvironment;
  PORT: number;
  LOG_FORMAT: LogFormat;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: boolean;
  DB_SYNCHRONIZE: boolean;
  DB_LOGGING: boolean;
}

type RawEnvironment = Record<string, string | undefined>;

const MIN_PORT = 1;
const MAX_PORT = 65535;

/**
 * Validates environment variables and fails fast on startup.
 * Error messages name the variable only, never its value, so secrets
 * such as DB_PASSWORD cannot leak into logs.
 */
export function validateEnv(raw: RawEnvironment): EnvironmentVariables {
  const errors: string[] = [];

  const readRequired = (key: string): string => {
    const value = raw[key]?.trim();
    if (!value) {
      errors.push(`${key} is not defined`);
      return '';
    }
    return value;
  };

  const readPort = (key: string, fallback: number): number => {
    const value = raw[key]?.trim();
    if (!value) {
      return fallback;
    }
    const port = Number(value);
    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
      errors.push(
        `${key} must be an integer between ${MIN_PORT} and ${MAX_PORT}`,
      );
      return fallback;
    }
    return port;
  };

  const readBoolean = (key: string, fallback: boolean): boolean => {
    const value = raw[key]?.trim().toLowerCase();
    if (!value) {
      return fallback;
    }
    if (value !== 'true' && value !== 'false') {
      errors.push(`${key} must be "true" or "false"`);
      return fallback;
    }
    return value === 'true';
  };

  const readOneOf = <T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
  ): T => {
    const value = raw[key]?.trim();
    if (!value) {
      return fallback;
    }
    if (!allowed.includes(value as T)) {
      errors.push(`${key} must be one of: ${allowed.join(', ')}`);
      return fallback;
    }
    return value as T;
  };

  const readMatching = (
    key: string,
    pattern: RegExp,
    fallback: string,
    rule: string,
  ): string => {
    const value = raw[key]?.trim();
    if (!value) {
      return fallback;
    }
    if (!pattern.test(value)) {
      errors.push(`${key} must be ${rule}`);
      return fallback;
    }
    return value;
  };

  const env: EnvironmentVariables = {
    SERVICE_NAME: readMatching(
      'SERVICE_NAME',
      SERVICE_NAME_PATTERN,
      DEFAULT_SERVICE_NAME,
      'lowercase kebab-case (e.g. front-desk), 3-50 characters',
    ),
    NODE_ENV: readOneOf('NODE_ENV', NODE_ENVIRONMENTS, 'development'),
    PORT: readPort('PORT', DEFAULT_APP_PORT),
    LOG_FORMAT: readOneOf('LOG_FORMAT', LOG_FORMATS, 'text'),
    DB_HOST: readRequired('DB_HOST'),
    DB_PORT: readPort('DB_PORT', DEFAULT_DB_PORT),
    DB_USERNAME: readRequired('DB_USERNAME'),
    DB_PASSWORD: readRequired('DB_PASSWORD'),
    DB_NAME: readRequired('DB_NAME'),
    DB_SSL: readBoolean('DB_SSL', false),
    DB_SYNCHRONIZE: readBoolean('DB_SYNCHRONIZE', false),
    DB_LOGGING: readBoolean('DB_LOGGING', false),
  };

  // Schema changes in shared environments must go through migrations (NFR-16).
  if (env.NODE_ENV === 'production' && env.DB_SYNCHRONIZE) {
    errors.push('DB_SYNCHRONIZE must not be true when NODE_ENV is production');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }

  return env;
}
