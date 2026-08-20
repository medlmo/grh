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
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export type StructureTreeNode = {
  id: number;
  code: string;
  libelleFr: string;
  libelleAr: string;
  type: string;
  parentId: number | null;
  agentCount: number;
  enfants: StructureTreeNode[];
};

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

  async getCorps(params: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.corps.findMany({
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
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      }),
      this.prisma.corps.count(),
    ]);
    return this.paginate(data, total, params);
  }

  async getCorpsCadres(corpsId: number, params: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.cadre.findMany({
      where: { corpsId },
      include: { _count: { select: { agents: true } } },
      orderBy: { code: 'asc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      }),
      this.prisma.cadre.count({ where: { corpsId } }),
    ]);
    return this.paginate(data, total, params);
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
    // Collect all descendant IDs
    const cadres  = await this.prisma.cadre.findMany({ where: { corpsId: id }, select: { id: true } });
    const cadreIds = cadres.map((c) => c.id);
    const grades  = cadreIds.length
      ? await this.prisma.grade.findMany({ where: { cadreId: { in: cadreIds } }, select: { id: true } })
      : [];
    const gradeIds = grades.map((g) => g.id);
    const echelons = gradeIds.length
      ? await this.prisma.echelon.findMany({ where: { gradeId: { in: gradeIds } }, select: { id: true } })
      : [];
    const echelonIds = echelons.map((e) => e.id);

    // Block if any agent is attached anywhere in the subtree
    const agentCount = await this.prisma.agent.count({
      where: {
        OR: [
          { corpsId: id },
          ...(cadreIds.length   ? [{ cadreId:   { in: cadreIds   } }] : []),
          ...(gradeIds.length   ? [{ gradeId:   { in: gradeIds   } }] : []),
          ...(echelonIds.length ? [{ echelonId: { in: echelonIds } }] : []),
        ],
      },
    });
    if (agentCount > 0)
      throw new BadRequestException(`Impossible : ${agentCount} agent(s) affecté(s) à ce corps ou à ses sous-éléments.`);

    // Cascade delete leaf → root inside a transaction
    return this.prisma.$transaction([
      ...(echelonIds.length ? [this.prisma.echelon.deleteMany({ where: { id: { in: echelonIds } } })] : []),
      ...(gradeIds.length   ? [this.prisma.grade.deleteMany({ where: { id: { in: gradeIds }   } })] : []),
      ...(cadreIds.length   ? [this.prisma.cadre.deleteMany({ where: { id: { in: cadreIds }   } })] : []),
      this.prisma.corps.delete({ where: { id } }),
    ]);
  }

  // ── Cadres ──────────────────────────────────────────────────────────────────

  async getCadreGrades(cadreId: number, params: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.grade.findMany({
      where: { cadreId },
      include: { _count: { select: { agents: true } } },
      orderBy: { code: 'asc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      }),
      this.prisma.grade.count({ where: { cadreId } }),
    ]);
    return this.paginate(data, total, params);
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
    const grades   = await this.prisma.grade.findMany({ where: { cadreId: id }, select: { id: true } });
    const gradeIds = grades.map((g) => g.id);
    const echelons = gradeIds.length
      ? await this.prisma.echelon.findMany({ where: { gradeId: { in: gradeIds } }, select: { id: true } })
      : [];
    const echelonIds = echelons.map((e) => e.id);

    const agentCount = await this.prisma.agent.count({
      where: {
        OR: [
          { cadreId: id },
          ...(gradeIds.length   ? [{ gradeId:   { in: gradeIds   } }] : []),
          ...(echelonIds.length ? [{ echelonId: { in: echelonIds } }] : []),
        ],
      },
    });
    if (agentCount > 0)
      throw new BadRequestException(`Impossible : ${agentCount} agent(s) affecté(s) à ce cadre ou à ses sous-éléments.`);

    return this.prisma.$transaction([
      ...(echelonIds.length ? [this.prisma.echelon.deleteMany({ where: { id: { in: echelonIds } } })] : []),
      ...(gradeIds.length   ? [this.prisma.grade.deleteMany({ where: { id: { in: gradeIds }   } })] : []),
      this.prisma.cadre.delete({ where: { id } }),
    ]);
  }

  // ── Grades ──────────────────────────────────────────────────────────────────

  async getGradeEchelons(gradeId: number, params: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.echelon.findMany({
      where: { gradeId },
      include: { _count: { select: { agents: true } } },
      orderBy: { numero: 'asc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      }),
      this.prisma.echelon.count({ where: { gradeId } }),
    ]);
    return this.paginate(data, total, params);
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
    const echelons   = await this.prisma.echelon.findMany({ where: { gradeId: id }, select: { id: true } });
    const echelonIds = echelons.map((e) => e.id);

    const agentCount = await this.prisma.agent.count({
      where: {
        OR: [
          { gradeId: id },
          ...(echelonIds.length ? [{ echelonId: { in: echelonIds } }] : []),
        ],
      },
    });
    if (agentCount > 0)
      throw new BadRequestException(`Impossible : ${agentCount} agent(s) affecté(s) à ce grade ou à ses échelons.`);

    return this.prisma.$transaction([
      ...(echelonIds.length ? [this.prisma.echelon.deleteMany({ where: { id: { in: echelonIds } } })] : []),
      this.prisma.grade.delete({ where: { id } }),
    ]);
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

  async getJoursFeries(annee: number | undefined, params: PaginationQueryDto) {
    let all;
    if (!annee) {
      all = await this.prisma.jourFerie.findMany({ orderBy: { date: 'asc' } });
    } else {
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
      all = [...mobiles, ...fixesMapped];
    }
    all.sort((a, b) => a.date.getTime() - b.date.getTime());
    const start = (params.page - 1) * params.limit;
    return this.paginate(all.slice(start, start + params.limit), all.length, params);
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

  async getStructures(params: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.structure.findMany({
      select: { id: true, code: true, libelleFr: true, libelleAr: true, type: true, parentId: true },
      orderBy: { code: 'asc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      }),
      this.prisma.structure.count(),
    ]);
    return this.paginate(data, total, params);
  }

  async getStructuresArbre(params: PaginationQueryDto) {
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
    const buildTree = (parentId: number | null): StructureTreeNode[] =>
      (map.get(parentId) ?? []).map((n) => ({
        id: n.id, code: n.code, libelleFr: n.libelleFr, libelleAr: n.libelleAr,
        type: n.type, parentId: n.parentId,
        agentCount: n._count.agents, enfants: buildTree(n.id),
      }));
    const tree = buildTree(null);
    const start = (params.page - 1) * params.limit;
    return this.paginate(tree.slice(start, start + params.limit), tree.length, params);
  }

  private paginate<T>(data: T[], total: number, params: PaginationQueryDto) {
    return {
      data,
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) },
    };
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
