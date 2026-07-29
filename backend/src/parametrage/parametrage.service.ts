import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCorpsDto, UpdateCorpsDto,
  CreateCadreDto, UpdateCadreDto,
  CreateGradeDto, UpdateGradeDto,
  CreateEchelonDto, UpdateEchelonDto,
  CreateJourFerieDto,
  UpdateCollectiviteDto,
  CreateStructureDto,
  UpdateStructureDto,
} from './dto/parametrage.dto';

@Injectable()
export class ParametrageService {
  constructor(private prisma: PrismaService) {}

  // ── Collectivité ────────────────────────────────────────────────────────────

  async getCollectivite() {
    return this.prisma.collectivite.findUnique({ where: { id: 1 } });
  }

  async updateCollectivite(dto: UpdateCollectiviteDto) {
    return this.prisma.collectivite.upsert({
      where: { id: 1 },
      update: dto,
      create: { id: 1, ...dto },
    });
  }

  // ── Corps ───────────────────────────────────────────────────────────────────

  async getCorps() {
    return this.prisma.corps.findMany({
      include: {
        cadres: {
          include: {
            grades: {
              include: { echelons: true },
              orderBy: { code: 'asc' },
            },
            _count: { select: { agents: true } },
          },
          orderBy: { code: 'asc' },
        },
        _count: { select: { agents: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getCorpsCadres(corpsId: number) {
    return this.prisma.cadre.findMany({
      where: { corpsId },
      include: { _count: { select: { agents: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async createCorps(dto: CreateCorpsDto) {
    return this.prisma.corps.create({ data: dto });
  }

  async updateCorps(id: number, dto: UpdateCorpsDto) {
    const exists = await this.prisma.corps.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Corps #${id} introuvable`);
    return this.prisma.corps.update({ where: { id }, data: dto });
  }

  async deleteCorps(id: number) {
    const childCount = await this.prisma.cadre.count({ where: { corpsId: id } });
    if (childCount > 0)
      throw new BadRequestException(`Impossible : ${childCount} cadre(s) rattaché(s) à ce corps.`);
    const agentCount = await this.prisma.agent.count({ where: { corpsId: id } });
    if (agentCount > 0)
      throw new BadRequestException(`Impossible : ${agentCount} agent(s) appartiennent à ce corps.`);
    return this.prisma.corps.delete({ where: { id } });
  }

  // ── Cadres ──────────────────────────────────────────────────────────────────

  async getCadreGrades(cadreId: number) {
    return this.prisma.grade.findMany({
      where: { cadreId },
      include: { _count: { select: { agents: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async createCadre(dto: CreateCadreDto) {
    return this.prisma.cadre.create({ data: dto });
  }

  async updateCadre(id: number, dto: UpdateCadreDto) {
    const exists = await this.prisma.cadre.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Cadre #${id} introuvable`);
    return this.prisma.cadre.update({ where: { id }, data: dto });
  }

  async deleteCadre(id: number) {
    const childCount = await this.prisma.grade.count({ where: { cadreId: id } });
    if (childCount > 0)
      throw new BadRequestException(`Impossible : ${childCount} grade(s) rattaché(s) à ce cadre.`);
    const agentCount = await this.prisma.agent.count({ where: { cadreId: id } });
    if (agentCount > 0)
      throw new BadRequestException(`Impossible : ${agentCount} agent(s) dans ce cadre.`);
    return this.prisma.cadre.delete({ where: { id } });
  }

  // ── Grades ──────────────────────────────────────────────────────────────────

  async getGradeEchelons(gradeId: number) {
    return this.prisma.echelon.findMany({
      where: { gradeId },
      include: { _count: { select: { agents: true } } },
      orderBy: { numero: 'asc' },
    });
  }

  async createGrade(dto: CreateGradeDto) {
    return this.prisma.grade.create({ data: dto });
  }

  async updateGrade(id: number, dto: UpdateGradeDto) {
    const exists = await this.prisma.grade.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Grade #${id} introuvable`);
    return this.prisma.grade.update({ where: { id }, data: dto });
  }

  async deleteGrade(id: number) {
    const childCount = await this.prisma.echelon.count({ where: { gradeId: id } });
    if (childCount > 0)
      throw new BadRequestException(`Impossible : ${childCount} échelon(s) rattaché(s) à ce grade.`);
    const agentCount = await this.prisma.agent.count({ where: { gradeId: id } });
    if (agentCount > 0)
      throw new BadRequestException(`Impossible : ${agentCount} agent(s) à ce grade.`);
    return this.prisma.grade.delete({ where: { id } });
  }

  // ── Échelons ─────────────────────────────────────────────────────────────────

  async createEchelon(dto: CreateEchelonDto) {
    return this.prisma.echelon.create({
      data: {
        gradeId:      dto.gradeId,
        numero:       dto.numero,
        dureeMinMois: dto.dureeMinMois ?? 24,
      },
    });
  }

  async updateEchelon(id: number, dto: UpdateEchelonDto) {
    const exists = await this.prisma.echelon.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Échelon #${id} introuvable`);
    return this.prisma.echelon.update({ where: { id }, data: dto });
  }

  async deleteEchelon(id: number) {
    const agentCount = await this.prisma.agent.count({ where: { echelonId: id } });
    if (agentCount > 0)
      throw new BadRequestException(`Impossible : ${agentCount} agent(s) à cet échelon.`);
    return this.prisma.echelon.delete({ where: { id } });
  }

  // ── Jours fériés ─────────────────────────────────────────────────────────────

  async getJoursFeries(annee?: number) {
    if (!annee) {
      return this.prisma.jourFerie.findMany({ orderBy: { date: 'asc' } });
    }
    const startOfYear = new Date(`${annee}-01-01`);
    const endOfYear   = new Date(`${annee}-12-31`);
    const mobiles = await this.prisma.jourFerie.findMany({
      where: { estMobile: true, date: { gte: startOfYear, lte: endOfYear } },
    });
    const fixes = await this.prisma.jourFerie.findMany({ where: { estMobile: false } });
    const fixesMapped = fixes.map((f) => {
      const d = new Date(f.date);
      d.setFullYear(annee);
      return { ...f, date: d };
    });
    const all = [...mobiles, ...fixesMapped];
    all.sort((a, b) => a.date.getTime() - b.date.getTime());
    return all;
  }

  async createJourFerie(dto: CreateJourFerieDto) {
    return this.prisma.jourFerie.create({
      data: {
        libelleFr: dto.libelleFr,
        libelleAr: dto.libelleAr,
        date:      new Date(dto.date),
        estMobile: dto.estMobile ?? false,
      },
    });
  }

  async deleteJourFerie(id: number) {
    return this.prisma.jourFerie.delete({ where: { id } });
  }

  // ── Structures (organigramme) ────────────────────────────────────────────────

  async getStructures() {
    return this.prisma.structure.findMany({
      select: { id: true, code: true, libelleFr: true, libelleAr: true, type: true, parentId: true },
      orderBy: { code: 'asc' },
    });
  }

  async getStructuresArbre() {
    const all = await this.prisma.structure.findMany({
      include: { _count: { select: { agents: true } } },
      orderBy: { libelleFr: 'asc' },
    });
    type NodeWithCount = (typeof all)[0];
    const map = new Map<number | null, NodeWithCount[]>();
    for (const s of all) {
      const key = s.parentId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    const buildTree = (parentId: number | null): any[] =>
      (map.get(parentId) ?? []).map((n) => ({
        id: n.id, code: n.code, libelleFr: n.libelleFr, libelleAr: n.libelleAr,
        type: n.type, parentId: n.parentId,
        agentCount: n._count.agents, enfants: buildTree(n.id),
      }));
    return buildTree(null);
  }

  async createStructure(dto: CreateStructureDto) {
    return this.prisma.structure.create({
      data: {
        code: dto.code, libelleFr: dto.libelleFr, libelleAr: dto.libelleAr,
        type: dto.type ?? 'SERVICE', parentId: dto.parentId ?? null,
      },
    });
  }

  async updateStructure(id: number, dto: UpdateStructureDto) {
    const exists = await this.prisma.structure.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Structure #${id} introuvable`);
    return this.prisma.structure.update({
      where: { id },
      data: {
        ...(dto.code      !== undefined && { code:      dto.code }),
        ...(dto.libelleFr !== undefined && { libelleFr: dto.libelleFr }),
        ...(dto.libelleAr !== undefined && { libelleAr: dto.libelleAr }),
        ...(dto.type      !== undefined && { type:      dto.type }),
        ...('parentId' in dto          && { parentId:  dto.parentId ?? null }),
      },
    });
  }

  async deleteStructure(id: number) {
    const [childCount, agentCount] = await Promise.all([
      this.prisma.structure.count({ where: { parentId: id } }),
      this.prisma.agent.count({ where: { structureId: id } }),
    ]);
    if (childCount > 0)
      throw new BadRequestException(`Impossible : ${childCount} sous-entité(s) rattachée(s).`);
    if (agentCount > 0)
      throw new BadRequestException(`Impossible : ${agentCount} agent(s) rattaché(s).`);
    return this.prisma.structure.delete({ where: { id } });
  }
}
