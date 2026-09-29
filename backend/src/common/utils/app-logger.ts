import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { LogFormat } from '../../config/constants';

type JsonLogOptions = {
  context: string;
  logLevel: LogLevel;
  writeStreamType?: 'stdout' | 'stderr';
  errorStack?: unknown;
};

/**
 * Application logger. In JSON mode every line carries the service name,
 * level, timestamp and context so logs can be traced across services (NFR-17, NFR-18).
 * Never pass personal data or secrets to the logger.
 */
export class AppLogger extends ConsoleLogger {
  constructor(
    format: LogFormat,
    private readonly serviceName: string,
  ) {
    super({ json: format === 'json', prefix: serviceName });
  }

  protected getJsonLogObject(message: unknown, options: JsonLogOptions) {
    return {
      service: this.serviceName,
      ...super.getJsonLogObject(message, options),
    };
  }
}
