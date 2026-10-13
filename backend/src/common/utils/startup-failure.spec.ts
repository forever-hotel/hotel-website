import { reportStartupFailure } from './startup-failure';

describe('reportStartupFailure', () => {
  it('should log a fatal message with the stack and exit with code 1 given a startup error', () => {
    // Arrange
    const logger = { fatal: jest.fn() };
    const exit = jest.fn();
    const error = new Error(
      'listen EADDRINUSE: address already in use :::3000',
    );

    // Act
    reportStartupFailure(error, logger, exit);

    // Assert
    expect(logger.fatal).toHaveBeenCalledWith(
      'Startup failed: Error',
      error.stack,
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should still exit given a value that is not an Error', () => {
    // Arrange
    const logger = { fatal: jest.fn() };
    const exit = jest.fn();

    // Act
    reportStartupFailure('boom', logger, exit);

    // Assert
    expect(logger.fatal).toHaveBeenCalledWith(
      'Startup failed: UnknownError',
      undefined,
    );
    expect(exit).toHaveBeenCalledWith(1);
  });
});
