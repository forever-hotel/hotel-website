import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/** Local backstop only; distributed per-client throttling belongs at the gateway. */
@Injectable()
export class ContactRateLimitGuard implements CanActivate {
  private readonly requests = new Map<
    string,
    { count: number; until: number }
  >();

  canActivate(context: ExecutionContext): boolean {
    const now = Date.now();
    for (const [key, record] of this.requests) {
      if (record.until <= now) this.requests.delete(key);
    }
    const request = context.switchToHttp().getRequest<Request>();
    // Never trust a caller-supplied X-Forwarded-For header here.
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const record = this.requests.get(ip);
    if (
      (record && record.count >= 5) ||
      (!record && this.requests.size >= 10000)
    ) {
      throw new HttpException(
        {
          error: 'RATE_LIMITED',
          message:
            'Too many enquiries. Please wait a minute before trying again.',
        },
        429,
      );
    }
    this.requests.set(ip, {
      count: (record?.count || 0) + 1,
      until: record?.until || now + 60000,
    });
    return true;
  }
}
