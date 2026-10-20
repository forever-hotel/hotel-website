import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '../utils/jwt-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let verify: jest.Mock;
  let guard: JwtAuthGuard;

  const contextFor = (authorization?: string): ExecutionContext => {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: authorization ? { authorization } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    verify = jest.fn();
    guard = new JwtAuthGuard({ verify } as unknown as JwtTokenService);
  });

  it('should attach verified claims given a valid bearer token', () => {
    // Arrange
    const claims = {
      iss: 'hotel-website',
      sub: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
      iat: 1,
      exp: 86401,
      role: 'GUEST' as const,
    };
    verify.mockReturnValue(claims);
    const context = contextFor('Bearer signed-token');

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
    expect(verify).toHaveBeenCalledWith('signed-token');
    expect(
      (context as unknown as { request: { user: unknown } }).request.user,
    ).toBe(claims);
  });

  it.each([undefined, 'Basic token', 'Bearer invalid-token'])(
    'should reject the request given authorization header %s',
    (authorization) => {
      // Arrange
      verify.mockReturnValue(null);
      const context = contextFor(authorization);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    },
  );
});
