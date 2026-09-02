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
  private readonly maxAccountAttempts = this.readPositiveInteger(
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX,
    10,
  );
  private readonly maxIpAttempts = this.readPositiveInteger(
    process.env.AUTH_LOGIN_RATE_LIMIT_IP_MAX,
    60,
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
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const email = this.readEmail(request);
    const limits = [
      { key: `account:${ip}:${email}`, max: this.maxAccountAttempts },
      { key: `ip:${ip}`, max: this.maxIpAttempts },
    ];

    for (const limit of limits) {
      const current = this.attempts.get(limit.key);
      if (current && now - current.windowStartedAt < this.windowMs && current.count >= limit.max) {
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
    }

    for (const limit of limits) {
      const current = this.attempts.get(limit.key);
      if (!current || now - current.windowStartedAt >= this.windowMs) {
        this.attempts.set(limit.key, { count: 1, windowStartedAt: now });
      } else {
        current.count += 1;
      }
    }
    this.cleanupExpiredEntries(now);
    return true;
  }

  private readEmail(request: Request): string {
    const body = request.body as { email?: unknown } | undefined;
    return typeof body?.email === 'string' && body.email.trim()
      ? body.email.trim().toLowerCase()
      : 'unknown';
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