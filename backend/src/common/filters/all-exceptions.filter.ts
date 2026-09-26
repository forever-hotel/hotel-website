import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const GENERIC_SERVER_ERROR_MESSAGE = 'An unexpected error occurred.';

interface ResolvedError {
  status: number;
  body: ErrorResponse;
}

/**
 * Converts every exception into the team error body and never exposes
 * stack traces to clients (OWASP A05). Server errors are logged with their stack.
 *
 * Throw a specific code with: new NotFoundException({ error: 'BOOKING_NOT_FOUND', message: '...' })
 *
 * Only HTTP requests are answered here. Other contexts (e.g. WebSocket gateways in
 * realtime/) have no HTTP response object; they are logged and should register their
 * own transport filter with @UseFilters (for example BaseWsExceptionFilter).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = this.resolve(exception);

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        body.message,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (host.getType() !== 'http') {
      return;
    }

    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (!(exception instanceof HttpException)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          error: 'INTERNAL_SERVER_ERROR',
          message: GENERIC_SERVER_ERROR_MESSAGE,
        },
      };
    }

    const status = exception.getStatus();
    const payload = exception.getResponse();
    const defaultCode = this.codeFromStatus(status);

    if (typeof payload === 'string') {
      return { status, body: { error: defaultCode, message: payload } };
    }

    const { error, message } = payload as {
      error?: unknown;
      message?: unknown;
    };

    return {
      status,
      body: {
        error:
          typeof error === 'string' && ERROR_CODE_PATTERN.test(error)
            ? error
            : defaultCode,
        message: this.toMessage(message, exception.message),
      },
    };
  }

  private toMessage(message: unknown, fallback: string): string {
    if (typeof message === 'string') {
      return message;
    }
    // ValidationPipe reports one message per invalid field.
    if (Array.isArray(message)) {
      return message.map(String).join('; ');
    }
    return fallback;
  }

  private codeFromStatus(status: number): string {
    const name = HttpStatus[status] as string | undefined;
    return name ?? 'HTTP_ERROR';
  }
}
