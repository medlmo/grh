import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDecisionDto } from './dto/decision.dto';

@Injectable()
export class DecisionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { type?: string; agentId?: number }) {
    const where: any = {};
    if (params?.type) where.type = params.type;
    if (params?.agentId) where.agentId = Number(params.agentId);
    return this.prisma.decisionAdmin.findMany({
      where,
      include: { agent: { select: { id: true, nomFr: true, prenomFr: true, matricule: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const decision = await this.prisma.decisionAdmin.findUnique({
      where: { id },
      include: { agent: true },
    });
    if (!decision) throw new NotFoundException('Décision introuvable.');
    return decision;
  }

  async create(dto: CreateDecisionDto) {
    const year = new Date().getFullYear();
    const count = await this.prisma.decisionAdmin.count({
      where: { numero: { startsWith: `${year}-` } },
    });
    const numero = `${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.decisionAdmin.create({
      data: {
        numero,
        type: dto.type,
        agentId: dto.agentId,
        objetFr: dto.objetFr,
        objetAr: dto.objetAr,
        contenuFr: dto.contenuFr,
        contenuAr: dto.contenuAr,
        dateEffet: new Date(dto.dateEffet),
        congeId: dto.congeId ?? null,
      },
      include: { agent: true },
    });
  }

  async signer(id: number, signataireId: number) {
    await this.findOne(id);
    return this.prisma.decisionAdmin.update({
      where: { id },
      data: {
        dateSignature: new Date(),
        signataireId,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.decisionAdmin.delete({ where: { id } });
  }
}
