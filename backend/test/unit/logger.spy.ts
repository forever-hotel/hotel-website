import { Logger } from '@nestjs/common';

// Silences Nest's Logger in unit tests and records what was logged, so tests
// can check the level and that messages contain no personal data.
const LOG_METHODS = ['verbose', 'debug', 'log', 'warn', 'error'] as const;

export type LoggerSpies = Record<
  (typeof LOG_METHODS)[number],
  jest.SpyInstance
>;

export function spyOnLogger(): LoggerSpies {
  const spies = {} as LoggerSpies;
  for (const method of LOG_METHODS) {
    spies[method] = jest
      .spyOn(Logger.prototype, method)
      .mockImplementation(() => undefined);
  }
  return spies;
}

/** Every message passed to the logger, at any level, as one string. */
export function allLoggedText(spies: LoggerSpies): string {
  return Object.values(spies)
    .flatMap((spy) => spy.mock.calls as unknown[][])
    .flat()
    .map(String)
    .join('\n');
}
