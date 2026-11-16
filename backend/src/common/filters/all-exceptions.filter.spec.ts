import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      getType: () => 'http',
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use the custom error code given an exception with a code-style error', () => {
    // Arrange
    const exception = new NotFoundException({
      error: 'BOOKING_NOT_FOUND',
      message: 'Booking was not found.',
    });

    // Act
    filter.catch(exception, host);

    // Assert
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: 'BOOKING_NOT_FOUND',
      message: 'Booking was not found.',
    });
  });

  it('should derive the error code from the status given a default Nest exception', () => {
    // Arrange
    const exception = new NotFoundException('Room type was not found.');

    // Act
    filter.catch(exception, host);

    // Assert
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: 'NOT_FOUND',
      message: 'Room type was not found.',
    });
  });

  it('should join validation messages given a list of field errors', () => {
    // Arrange
    const exception = new BadRequestException([
      'email must be an email',
      'password is too short',
    ]);

    // Act
    filter.catch(exception, host);

    // Assert
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'BAD_REQUEST',
      message: 'email must be an email; password is too short',
    });
  });

  it('should use the message as-is given a string response body', () => {
    // Arrange
    const exception = new HttpException('Too many requests', 429);

    // Act
    filter.catch(exception, host);

    // Assert
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many requests',
    });
  });

  it('should hide internal details in both the response and log given an unexpected error', () => {
    // Arrange
    const exception = new Error('password authentication failed for user x');

    // Act
    filter.catch(exception, host);

    // Assert
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    });
    expect(errorSpy).toHaveBeenCalledWith({
      event: 'request_failed',
      status: 500,
    });
  });

  it('should not log given a client error', () => {
    // Act
    filter.catch(new BadRequestException('Invalid dates'), host);

    // Assert
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should only log and not write a response given a non-HTTP context', () => {
    // Arrange
    const wsHost = {
      getType: () => 'ws',
      switchToHttp: () => {
        throw new Error('switchToHttp must not be called outside HTTP');
      },
    } as unknown as ArgumentsHost;
    const exception = new Error('socket handler failed');

    // Act
    filter.catch(exception, wsHost);

    // Assert
    expect(status).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith({
      event: 'request_failed',
      status: 500,
    });
  });

  it('never logs secret canaries from error messages, stacks or database parameters', () => {
    const secret = 'security-canary-password-and-provider-secret';
    const exception = Object.assign(new Error(secret), {
      parameters: [secret, '4111111111111111', '123'],
      query: `INSERT INTO guests VALUES ('${secret}')`,
    });
    exception.name = secret;
    filter.catch(exception, host);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      '4111111111111111',
    );
    expect(JSON.stringify(json.mock.calls)).not.toContain(secret);
  });
});
