import { Controller, Post, Body, Get, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
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
    const result = await this.auth.login(dto, `${req.ip}:${dto.email.toLowerCase()}`);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...publicResult } = result;
    return publicResult;
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.readRefreshCookie(req);
    if (!token) {
      throw new UnauthorizedException('Session de renouvellement absente.');
    }
    const result = await this.auth.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...publicResult } = result;
    return publicResult;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('id') userId: number) {
    return this.auth.me(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser('id') userId: number, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Set-Cookie', this.clearRefreshCookie());
    return this.auth.logout(userId);
  }

  private setRefreshCookie(res: Response, token: string): void {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader(
      'Set-Cookie',
      `refreshToken=${encodeURIComponent(token)}; HttpOnly; Path=/api/auth; Max-Age=604800; SameSite=Lax${secure}`,
    );
  }

  private clearRefreshCookie(): string {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `refreshToken=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=Lax${secure}`;
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
