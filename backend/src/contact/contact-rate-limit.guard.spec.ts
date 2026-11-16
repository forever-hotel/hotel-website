import { ExecutionContext } from '@nestjs/common';
import { ContactRateLimitGuard } from './contact-rate-limit.guard';

function context(ip?: string, remoteAddress?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip, socket: { remoteAddress } }),
    }),
  } as ExecutionContext;
}

describe('ContactRateLimitGuard', () => {
  afterEach(() => jest.restoreAllMocks());
  it('limits each connection IP and expires the window', () => {
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const guard = new ContactRateLimitGuard();
    for (let n = 0; n < 5; n++)
      expect(guard.canActivate(context('one'))).toBe(true);
    expect(() => guard.canActivate(context('one'))).toThrow(
      'Too many enquiries',
    );
    expect(guard.canActivate(context('two'))).toBe(true);
    now += 60000;
    expect(guard.canActivate(context('one'))).toBe(true);
  });
  it('uses socket fallback or an unknown connection without trusting headers', () => {
    const guard = new ContactRateLimitGuard();
    expect(guard.canActivate(context(undefined, 'socket-ip'))).toBe(true);
    expect(guard.canActivate(context())).toBe(true);
  });
});
