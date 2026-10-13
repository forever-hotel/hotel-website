import { QueryFailedError } from 'typeorm';

// PostgreSQL error code for a UNIQUE or PRIMARY KEY conflict.
const UNIQUE_VIOLATION = '23505';

/** Returns true when PostgreSQL rejected a write because a unique value already exists. */
export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as Error & { code?: string };
  return driverError.code === UNIQUE_VIOLATION;
}
