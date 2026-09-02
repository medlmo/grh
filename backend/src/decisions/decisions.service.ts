import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDecisionDto, DecisionsQueryDto } from './dto/decision.dto';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { StructureScopeService } from '../common/services/structure-scope.service';

@Injectable()
export class DecisionsService {
  constructor(
    private prisma: PrismaService,
    private readonly structureScope: StructureScopeService,
  ) {}

  async findAll(params: DecisionsQueryDto, user: AuthenticatedUser) {
    const where: Prisma.DecisionAdminWhereInput = {
      agent: await this.structureScope.getAgentWhere(user),
    };
    if (params?.type) where.type = params.type;
    if (params?.agentId) where.agentId = Number(params.agentId);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.decisionAdmin.findMany({
        where,
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true, matricule: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.decisionAdmin.count({ where }),
    ]);
    return {
      data,
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) },
    };
  }

  async findOne(id: number, user?: AuthenticatedUser) {
    const decision = await this.prisma.decisionAdmin.findFirst({
      where: user
        ? { id, agent: await this.structureScope.getAgentWhere(user) }
        : { id },
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
