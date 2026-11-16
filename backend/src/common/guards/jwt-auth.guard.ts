import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedGuest } from '../interfaces/authenticated-guest.interface';
import { JwtTokenService } from '../utils/jwt-token.service';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedGuest;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === 'string'
        ? /^Bearer ([^\s]+)$/i.exec(authorization)
        : null;
    const claims = match ? this.jwtTokenService.verify(match[1]) : null;

    if (!claims) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'A valid bearer token is required.',
      });
    }

    request.user = claims;
    return true;
  }
}
