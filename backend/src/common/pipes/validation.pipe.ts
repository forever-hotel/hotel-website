import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

export const VALIDATION_ERROR_CODE = 'VALIDATION_FAILED';

/** Turns class-validator errors (including nested DTOs) into readable messages. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  return errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const messages = Object.values(error.constraints ?? {}).map((message) =>
      parentPath ? `${path}: ${message}` : message,
    );
    return [
      ...messages,
      ...flattenValidationErrors(error.children ?? [], path),
    ];
  });
}

/**
 * Global request validation for every DTO (SDS 6.4, OWASP A03):
 * - whitelist + forbidNonWhitelisted: unknown properties are rejected, not silently kept
 * - transform: payloads become DTO class instances, and route/query params get their declared types
 * Failures return 400 { "error": "VALIDATION_FAILED", "message": "..." }.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        error: VALIDATION_ERROR_CODE,
        message: flattenValidationErrors(errors),
      }),
  });
}
