import { QueryFailedError } from 'typeorm';
import { isUniqueViolation } from './postgres-errors';

function queryFailed(code: string): QueryFailedError {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('db error'), { code }),
  );
}

describe('isUniqueViolation', () => {
  it('should return true given a PostgreSQL unique violation', () => {
    // Act & Assert
    expect(isUniqueViolation(queryFailed('23505'))).toBe(true);
  });

  it('should return false given a different PostgreSQL error', () => {
    // Act & Assert
    expect(isUniqueViolation(queryFailed('23503'))).toBe(false);
  });

  it('should return false given an error that is not a query failure', () => {
    // Act & Assert
    expect(isUniqueViolation(new Error('network'))).toBe(false);
  });
});
