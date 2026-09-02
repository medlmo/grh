import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto, UpdateUtilisateurDto, UtilisateursQueryDto } from './dto/utilisateur.dto';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role, StatutCompte } from '@prisma/client';

@Injectable()
export class UtilisateursService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: UtilisateursQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.utilisateur.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          statut: true,
          agentId: true,
          derniereConn: true,
          createdAt: true,
          agent: {
            select: { nomFr: true, prenomFr: true, matricule: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.utilisateur.count(),
    ]);
    return {
      data,
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        statut: true,
        agentId: true,
        derniereConn: true,
        createdAt: true,
        agent: true
      }
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(dto: CreateUtilisateurDto) {
    const existing = await this.prisma.utilisateur.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const hashedPassword = await bcrypt.hash(dto.motDePasse, 12);
    
    return this.prisma.utilisateur.create({
      data: {
        ...dto,
        motDePasse: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        role: true,
        statut: true,
      }
    });
  }

  async update(id: number, dto: UpdateUtilisateurDto, actorId: number) {
    const target = await this.findOne(id);

    if (target.role === Role.ADMIN && target.id !== actorId) {
      throw new ForbiddenException("Un administrateur ne peut pas modifier le compte d'un autre administrateur.");
    }
    if (target.id === actorId && (dto.role !== undefined || dto.statut !== undefined)) {
      throw new ForbiddenException("Un administrateur ne peut pas modifier son propre rôle ou statut.");
    }

    const data: Prisma.UtilisateurUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.statut !== undefined) data.statut = dto.statut;
    if (dto.agentId !== undefined) {
      data.agent = { connect: { id: dto.agentId } };
    }
    if (dto.motDePasse) data.motDePasse = await bcrypt.hash(dto.motDePasse, 12);
    if (dto.statut !== undefined && dto.statut !== StatutCompte.ACTIF) {
      data.refreshToken = null;
    }
    
    if (dto.email) {
      const existing = await this.prisma.utilisateur.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    return this.prisma.utilisateur.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        statut: true,
      }
    });
  }

  async remove(id: number, actorId: number) {
    const target = await this.findOne(id);
    if (target.id === actorId) {
      throw new ForbiddenException('Un administrateur ne peut pas supprimer son propre compte.');
    }
    if (target.role === Role.ADMIN) {
      throw new ForbiddenException("Un administrateur ne peut pas supprimer le compte d'un autre administrateur.");
    }
    return this.prisma.utilisateur.delete({ where: { id } });
  }
}
