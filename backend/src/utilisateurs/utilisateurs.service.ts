import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto, UpdateUtilisateurDto } from './dto/utilisateur.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UtilisateursService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.utilisateur.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        statut: true,
        agentId: true,
        derniereConn: true,
        createdAt: true,
        agent: {
          select: { nomFr: true, prenomFr: true, matricule: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
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

    const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);
    
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

  async update(id: number, dto: UpdateUtilisateurDto) {
    await this.findOne(id);

    const data: any = { ...dto };
    if (dto.motDePasse) {
      data.motDePasse = await bcrypt.hash(dto.motDePasse, 10);
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

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.utilisateur.delete({ where: { id } });
  }
}
