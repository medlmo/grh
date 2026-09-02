import { Controller, Post, Body, Get, UseGuards, Req, Res, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @UseGuards(LoginRateLimitGuard)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, `${req.ip}:${dto.email.trim().toLowerCase()}`);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertTrustedOrigin(req);
    const token = this.readRefreshCookie(req);
    if (!token) {
      throw new UnauthorizedException('Session de renouvellement absente.');
    }
    try {
      const result = await this.auth.refresh(token);
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
      return { message: 'Session renouvelée.' };
    } catch (error) {
      res.setHeader('Set-Cookie', this.clearAuthCookies());
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('id') userId: number) {
    return this.auth.me(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser('id') userId: number, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Set-Cookie', this.clearAuthCookies());
    return this.auth.logout(userId);
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader(
      'Set-Cookie',
      [
        `accessToken=${encodeURIComponent(accessToken)}; HttpOnly; Path=/api; Max-Age=900; SameSite=Strict${secure}`,
        `refreshToken=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/api/auth; Max-Age=604800; SameSite=Strict${secure}`,
      ],
    );
  }

  private clearAuthCookies(): string[] {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return [
      `accessToken=; HttpOnly; Path=/api; Max-Age=0; SameSite=Strict${secure}`,
      `refreshToken=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=Strict${secure}`,
    ];
  }

  private assertTrustedOrigin(req: Request): void {
    const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const replitDomains = [process.env.REPLIT_DEV_DOMAIN, ...(process.env.REPLIT_DOMAINS ?? '').split(',')]
      .filter((domain): domain is string => Boolean(domain))
      .map((domain) => domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
      .filter(Boolean);
    for (const domain of replitDomains) {
      for (const protocol of ['http', 'https']) {
        const origin = `${protocol}://${domain}`;
        if (!configuredOrigins.includes(origin)) configuredOrigins.push(origin);
      }
    }
    const origin = req.get('origin');
    const referer = req.get('referer');

    const isAllowed = (value: string | undefined): boolean => {
      if (!value) return false;
      try {
        return configuredOrigins.includes(new URL(value).origin);
      } catch {
        return false;
      }
    };

    if (!isAllowed(origin) && !isAllowed(referer)) {
      throw new ForbiddenException('Origine de la requête non autorisée.');
    }
    if (origin && !isAllowed(origin)) {
      throw new ForbiddenException('Origine de la requête non autorisée.');
    }
    if (referer && !isAllowed(referer)) {
      throw new ForbiddenException('Référent de la requête non autorisé.');
    }
  }

  private readRefreshCookie(req: Request): string | undefined {
    const raw = req.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('refreshToken='));
    if (!raw) return undefined;

    try {
      return decodeURIComponent(raw.slice('refreshToken='.length));
    } catch {
      throw new UnauthorizedException('Cookie de session invalide.');
    }
  }
}
