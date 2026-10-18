// Each subsystem sets SERVICE_NAME in its .env (e.g. front-desk, kitchen); this is the fallback.
export const DEFAULT_SERVICE_NAME = 'hotel-website';
// Lowercase kebab-case, used in logs and the /health response.
export const SERVICE_NAME_PATTERN = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/;

export const DEFAULT_APP_PORT = 3000;
export const DEFAULT_DB_PORT = 5432;
// Fail a stuck connection attempt instead of waiting forever (e.g. a firewall silently dropping traffic).
export const DB_CONNECT_TIMEOUT_MS = 10_000;

export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export const LOG_FORMATS = ['text', 'json'] as const;
export type LogFormat = (typeof LOG_FORMATS)[number];

// Most detailed first; a level shows itself and every level after it.
// verbose = trace detail, debug = developer detail, log = normal events (info).
export const LOG_LEVELS = ['verbose', 'debug', 'log', 'warn', 'error'] as const;
export type AppLogLevel = (typeof LOG_LEVELS)[number];
// SDS Table 20: debug logs in development, warnings and errors in production.
export const DEFAULT_LOG_LEVELS: Record<NodeEnvironment, AppLogLevel> = {
  development: 'debug',
  test: 'warn',
  production: 'warn',
};

// Passwords are hashed with bcrypt at this cost (SDS 6.1.2: cost >= 12).
export const BCRYPT_COST = 12;

// Input rules from SDS Table 14 and the team's registration decision (CLAUDE.md §11.2).
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected.
export const PASSWORD_MAX_BYTES = 72;
export const GUEST_NAME_MAX_LENGTH = 255;
// Letters in any script (including Sinhala and Tamil marks), spaces, hyphens and apostrophes.
export const GUEST_NAME_PATTERN = /^\p{L}[\p{L}\p{M} '’-]*$/u;
export const EMAIL_MAX_LENGTH = 320;
// 10-15 digits with an optional leading +.
export const PHONE_PATTERN = /^\+?\d{10,15}$/;

// Interactive API documentation (Swagger UI); not served in production.
export const API_DOCS_PATH = 'docs';
