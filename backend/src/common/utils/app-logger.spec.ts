import { AppLogger, logLevelsFrom } from './app-logger';

describe('logLevelsFrom', () => {
  it('should include the minimum level and every more serious level', () => {
    // Act & Assert
    expect(logLevelsFrom('log')).toEqual(['log', 'warn', 'error', 'fatal']);
  });

  it('should include every level given verbose', () => {
    // Act & Assert
    expect(logLevelsFrom('verbose')).toEqual([
      'verbose',
      'debug',
      'log',
      'warn',
      'error',
      'fatal',
    ]);
  });
});

describe('AppLogger', () => {
  let write: jest.SpyInstance;

  const firstLine = (): string =>
    String((write.mock.calls as unknown[][])[0][0]);

  beforeEach(() => {
    write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should emit one JSON line with the configured service name given json format', () => {
    // Arrange
    const logger = new AppLogger('json', 'front-desk');

    // Act
    logger.log('Booking service ready', 'Bootstrap');

    // Assert
    const line = firstLine();
    expect(JSON.parse(line) as unknown).toMatchObject({
      service: 'front-desk',
      level: 'log',
      context: 'Bootstrap',
      message: 'Booking service ready',
    });
  });

  it('should hide messages below the configured level', () => {
    // Arrange
    const logger = new AppLogger('json', 'front-desk', 'warn');

    // Act
    logger.debug('Query details', 'GuestRepository');
    logger.log('Guest account created', 'GuestRepository');

    // Assert
    expect(write).not.toHaveBeenCalled();
  });

  it('should emit human-readable text given text format', () => {
    // Arrange
    const logger = new AppLogger('text', 'front-desk');

    // Act
    logger.log('Booking service ready', 'Bootstrap');

    // Assert
    const line = firstLine();
    expect(line).toContain('[front-desk]');
    expect(line).toContain('Booking service ready');
    expect(() => JSON.parse(line) as unknown).toThrow();
  });
});
