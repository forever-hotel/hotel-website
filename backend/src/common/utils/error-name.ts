/**
 * Returns only the error's class name (e.g. QueryFailedError). Safe to log:
 * database messages can contain connection details or personal data.
 */
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
