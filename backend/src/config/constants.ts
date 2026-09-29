// Each subsystem sets SERVICE_NAME in its .env (e.g. front-desk, kitchen); this is the fallback.
export const DEFAULT_SERVICE_NAME = 'hotel-website';
// Lowercase kebab-case, used in logs and in the service's migrations table name.
export const SERVICE_NAME_PATTERN = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/;

export const DEFAULT_APP_PORT = 3000;
export const DEFAULT_DB_PORT = 5432;
// Fail a stuck connection attempt instead of waiting forever (e.g. a firewall silently dropping traffic).
export const DB_CONNECT_TIMEOUT_MS = 10_000;

export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export const LOG_FORMATS = ['text', 'json'] as const;
export type LogFormat = (typeof LOG_FORMATS)[number];
