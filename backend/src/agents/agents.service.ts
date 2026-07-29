import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { search?: string; statut?: string; structureId?: number }) {
    const where: any = {};
    if (params?.statut) where.statut = params.statut;
    if (params?.structureId) where.structureId = Number(params.structureId);
    if (params?.search) {
      where.OR = [
        { matricule: { contains: params.search, mode: 'insensitive' } },
        { nomFr: { contains: params.search, mode: 'insensitive' } },
        { prenomFr: { contains: params.search, mode: 'insensitive' } },
        { cin: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    // Vue liste : select minimal — évite de charger corps, cadre, echelle inutilement
    return this.prisma.agent.findMany({
      where,
      select: {
        id: true,
        matricule: true,
        nomFr: true,
        prenomFr: true,
        nomAr: true,
        prenomAr: true,
        sexe: true,
        statut: true,
        statutCarriere: true,
        fonctionFr: true,
        createdAt: true,
        structure: { select: { id: true, libelleFr: true } },
        grade: { select: { id: true, libelleFr: true } },
      },
      orderBy: { nomFr: 'asc' },
    });
  }

  async findOne(id: number) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        structure: true,
        grade: { include: { echelons: true } },
        corps: true,
        cadre: true,
        echelon: true,
        diplomes: true,
        carriereHistorique: { orderBy: { dateEffet: 'desc' } },
        piecesJointes: true,
      },
    });
    if (!agent) throw new NotFoundException('Agent introuvable.');
    return agent;
  }

  async create(dto: CreateAgentDto) {
    return this.prisma.agent.create({
      data: {
        ...dto,
        dateNaissance: new Date(dto.dateNaissance),
        dateRecrutement: new Date(dto.dateRecrutement),
        dateTitularisation: dto.dateTitularisation ? new Date(dto.dateTitularisation) : null,
        dateFinContrat: dto.dateFinContrat ? new Date(dto.dateFinContrat) : null,
      },
      include: { structure: true, grade: true, corps: true },
    });
  }

  async update(id: number, dto: UpdateAgentDto) {
    await this.findOne(id);
    return this.prisma.agent.update({
      where: { id },
      data: {
        ...dto,
        dateNaissance: new Date(dto.dateNaissance),
        dateRecrutement: new Date(dto.dateRecrutement),
        dateTitularisation: dto.dateTitularisation ? new Date(dto.dateTitularisation) : null,
        dateFinContrat: dto.dateFinContrat ? new Date(dto.dateFinContrat) : null,
      },
      include: { structure: true, grade: true, corps: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.agent.delete({ where: { id } });
  }

  // Historique de carrière
  async addCarriereEvent(agentId: number, data: any) {
    return this.prisma.carriereHistorique.create({
      data: { agentId, ...data, dateEffet: new Date(data.dateEffet) },
    });
  }

  // Pièces jointes (métadonnées — le fichier est géré via upload)
  async addPiece(agentId: number, data: any) {
    return this.prisma.pieceJointe.create({ data: { agentId, ...data } });
  }

  async removePiece(agentId: number, pieceId: number) {
    return this.prisma.pieceJointe.delete({ where: { id: pieceId, agentId } });
  }

  // Calcul d'ancienneté en années
  async anciennete(agentId: number) {
    const agent = await this.findOne(agentId);
    const now = Date.now();
    const years = (now - agent.dateRecrutement.getTime()) / (365.25 * 24 * 3600 * 1000);
    return { annees: Math.floor(years), mois: Math.floor((years % 1) * 12) };
  }
}
