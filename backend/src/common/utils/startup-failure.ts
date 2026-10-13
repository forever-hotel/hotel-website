import { Logger } from '@nestjs/common';
import { errorName } from './error-name';

const STARTUP_FAILURE_EXIT_CODE = 1;

/**
 * Logs a startup failure through the shared logger, then stops the process so
 * Docker sees the container fail. Errors inside NestFactory.create are already
 * logged by Nest; this covers later steps such as app.listen (port in use).
 */
export function reportStartupFailure(
  error: unknown,
  logger: Pick<Logger, 'fatal'> = new Logger('Bootstrap'),
  exit: (code: number) => void = (code) => process.exit(code),
): void {
  logger.fatal(
    `Startup failed: ${errorName(error)}`,
    error instanceof Error ? error.stack : undefined,
  );
  exit(STARTUP_FAILURE_EXIT_CODE);
}
