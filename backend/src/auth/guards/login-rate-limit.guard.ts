import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, RateLimitEntry>();
  private readonly maxAttempts = this.readPositiveInteger(
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX,
    10,
  );
  private readonly windowMs = this.readPositiveInteger(
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
    60_000,
  );

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const now = Date.now();
    const clientKey = request.ip || request.socket.remoteAddress || 'unknown';
    const current = this.attempts.get(clientKey);

    if (!current || now - current.windowStartedAt >= this.windowMs) {
      this.attempts.set(clientKey, { count: 1, windowStartedAt: now });
      this.cleanupExpiredEntries(now);
      return true;
    }

    if (current.count >= this.maxAttempts) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((this.windowMs - (now - current.windowStartedAt)) / 1000),
      );
      response.setHeader('Retry-After', retryAfterSeconds.toString());
      throw new HttpException(
        'Trop de tentatives de connexion. Réessayez plus tard.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    return true;
  }

  private cleanupExpiredEntries(now: number): void {
    for (const [key, entry] of this.attempts) {
      if (now - entry.windowStartedAt >= this.windowMs) {
        this.attempts.delete(key);
      }
    }
  }

  private readPositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}