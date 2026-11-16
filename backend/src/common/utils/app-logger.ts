import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { AppLogLevel, LOG_LEVELS, LogFormat } from '../../config/constants';

type JsonLogOptions = {
  context: string;
  logLevel: LogLevel;
  writeStreamType?: 'stdout' | 'stderr';
  errorStack?: unknown;
};

/** Returns the minimum level and every more serious level (fatal is always on). */
export function logLevelsFrom(minimum: AppLogLevel): LogLevel[] {
  return [...LOG_LEVELS.slice(LOG_LEVELS.indexOf(minimum)), 'fatal'];
}

/**
 * Application logger. In JSON mode every line carries the service name,
 * level, timestamp and context so logs can be traced across services (NFR-17, NFR-18).
 * Never pass personal data or secrets to the logger.
 */
export class AppLogger extends ConsoleLogger {
  constructor(
    format: LogFormat,
    private readonly serviceName: string,
    level: AppLogLevel = 'log',
  ) {
    super({
      json: format === 'json',
      prefix: serviceName,
      logLevels: logLevelsFrom(level),
    });
  }

  protected getJsonLogObject(message: unknown, options: JsonLogOptions) {
    return {
      service: this.serviceName,
      ...super.getJsonLogObject(message, options),
    };
  }
}
