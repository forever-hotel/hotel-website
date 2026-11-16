import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedGuest } from '../interfaces/authenticated-guest.interface';

export const CurrentGuest = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedGuest => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedGuest }>();
    return request.user;
  },
);
