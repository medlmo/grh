import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StatutCompte } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  agentId?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const rawCookie = request.headers.cookie
            ?.split(';')
            .map((value) => value.trim())
            .find((value) => value.startsWith('accessToken='));
          return rawCookie
            ? decodeURIComponent(rawCookie.slice('accessToken='.length))
            : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: payload.sub },
      include: { agent: { select: { deletedAt: true } } },
    });
    if (!user || user.statut !== StatutCompte.ACTIF || user.agent?.deletedAt) {
      throw new UnauthorizedException('Compte suspendu, bloqué ou supprimé.');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      agentId: user.agentId ?? undefined,
    };
  }
}
