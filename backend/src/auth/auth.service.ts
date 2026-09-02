import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/auth.dto';
import { StatutCompte } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, {
    failures: number;
    firstFailureAt: number;
    blockedUntil: number;
  }>();
  private readonly maxLoginFailures = 5;
  private readonly loginWindowMs = 15 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, clientKey = dto.email.toLowerCase()) {
    this.assertLoginAllowed(clientKey);
    const user = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
      include: { agent: true },
    });
    if (!user || user.agent?.deletedAt) {
      this.recordLoginFailure(clientKey);
      throw new UnauthorizedException('Identifiants invalides.');
    }
    if (user.statut !== StatutCompte.ACTIF) {
      this.recordLoginFailure(clientKey);
      throw new UnauthorizedException('Compte suspendu ou bloqué.');
    }
    const ok = await bcrypt.compare(dto.motDePasse, user.motDePasse);
    if (!ok) {
      this.recordLoginFailure(clientKey);
      throw new UnauthorizedException('Identifiants invalides.');
    }
    this.loginAttempts.delete(clientKey);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agentId: user.agentId,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d',
    });

    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: { refreshToken: this.hashToken(refreshToken), derniereConn: new Date(), lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        agentId: user.agentId,
        nomComplet: user.agent
          ? `${user.agent.prenomFr} ${user.agent.nomFr}`
          : user.email,
      },
    };
  }

  async refresh(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token);
      const user = await this.prisma.utilisateur.findUnique({
        where: { id: payload.sub },
        include: { agent: { select: { deletedAt: true } } },
      });
      if (!user || !user.refreshToken || user.refreshToken !== this.hashToken(token)) {
        throw new UnauthorizedException();
      }
      if (user.statut !== StatutCompte.ACTIF || user.agent?.deletedAt) {
        await this.prisma.utilisateur.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
        throw new UnauthorizedException();
      }
      const newPayload = { sub: user.id, email: user.email, role: user.role, agentId: user.agentId };
      const accessToken = await this.jwt.signAsync(newPayload, {
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m',
      });
      const refreshToken = await this.jwt.signAsync(newPayload, {
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d',
      });
      await this.prisma.utilisateur.update({
        where: { id: user.id },
        data: { refreshToken: this.hashToken(refreshToken) },
      });
      return { accessToken, refreshToken };
    } catch {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter.');
    }
  }

  async me(userId: number) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: { agent: { include: { structure: true, grade: true, corps: true, cadre: true } } },
    });
    if (!user) throw new UnauthorizedException();
    const { motDePasse, refreshToken, ...rest } = user;
    return rest;
  }

  async logout(userId: number) {
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Déconnexion réussie.' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private assertLoginAllowed(clientKey: string): void {
    const attempt = this.loginAttempts.get(clientKey);
    if (attempt && attempt.blockedUntil > Date.now()) {
      throw new UnauthorizedException('Trop de tentatives. Réessayez plus tard.');
    }
    if (attempt && (attempt.blockedUntil > 0 || Date.now() - attempt.firstFailureAt >= this.loginWindowMs)) {
      this.loginAttempts.delete(clientKey);
    }
  }

  private recordLoginFailure(clientKey: string): void {
    const current = this.loginAttempts.get(clientKey) ?? {
      failures: 0,
      firstFailureAt: Date.now(),
      blockedUntil: 0,
    };
    current.failures += 1;
    if (current.failures >= this.maxLoginFailures) {
      current.blockedUntil = Date.now() + this.loginWindowMs;
    }
    this.loginAttempts.set(clientKey, current);
  }
}
