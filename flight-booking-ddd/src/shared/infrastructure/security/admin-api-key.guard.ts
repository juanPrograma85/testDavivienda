import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const API_KEY_HEADER = 'x-api-key';

/**
 * Protects administrative write endpoints (e.g. flight status changes).
 * Comparison is constant-time to avoid leaking the key through timing analysis.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header(API_KEY_HEADER);
    const expected = this.config.get<string>('ADMIN_API_KEY');

    if (!provided || !expected || !this.matches(provided, expected)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }

  private matches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) {
      // Still burn a comparison to keep the timing profile flat.
      timingSafeEqual(a, a);
      return false;
    }
    return timingSafeEqual(a, b);
  }
}
