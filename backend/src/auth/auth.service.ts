import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/auth.dto';
import { StatutCompte } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
      include: { agent: true },
    });
    if (!user) throw new UnauthorizedException('Identifiants invalides.');
    if (user.statut !== StatutCompte.ACTIF) {
      throw new UnauthorizedException('Compte suspendu ou bloqué.');
    }
    const ok = await bcrypt.compare(dto.motDePasse, user.motDePasse);
    if (!ok) throw new UnauthorizedException('Identifiants invalides.');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agentId: user.agentId,
    };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwt.signAsync(payload, { expiresIn: '7d' });

    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: { refreshToken, derniereConn: new Date() },
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
      });
      if (!user || user.refreshToken !== token) {
        throw new UnauthorizedException();
      }
      const newPayload = { sub: user.id, email: user.email, role: user.role, agentId: user.agentId };
      const accessToken = await this.jwt.signAsync(newPayload, { expiresIn: '15m' });
      return { accessToken };
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
}
