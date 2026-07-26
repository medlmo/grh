import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCorpsDto,
  CreateCadreDto,
  CreateGradeDto,
  CreateEchelleDto,
  CreateEchelonDto,
  CreateJourFerieDto,
  UpdateCollectiviteDto,
  CreateStructureDto,
} from './dto/parametrage.dto';

@Injectable()
export class ParametrageService {
  constructor(private prisma: PrismaService) {}

  // --- Collectivité ---
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

  // --- Corps ---
  async getCorps() {
    return this.prisma.corps.findMany({
      include: {
        cadres: {
          include: {
            grades: {
              include: {
                echelles: {
                  include: { echelons: true },
                },
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getCorpsCadres(corpsId: number) {
    return this.prisma.cadre.findMany({
      where: { corpsId },
      orderBy: { code: 'asc' },
    });
  }

  async createCorps(dto: CreateCorpsDto) {
    return this.prisma.corps.create({ data: dto });
  }

  async deleteCorps(id: number) {
    return this.prisma.corps.delete({ where: { id } });
  }

  // --- Cadres ---
  async getCadreGrades(cadreId: number) {
    return this.prisma.grade.findMany({
      where: { cadreId },
      orderBy: { code: 'asc' },
    });
  }

  async createCadre(dto: CreateCadreDto) {
    return this.prisma.cadre.create({ data: dto });
  }

  async deleteCadre(id: number) {
    return this.prisma.cadre.delete({ where: { id } });
  }

  // --- Grades ---
  async getGradeEchelles(gradeId: number) {
    return this.prisma.echelle.findMany({
      where: { gradeId },
      include: { echelons: true },
      orderBy: { numero: 'asc' },
    });
  }

  async createGrade(dto: CreateGradeDto) {
    return this.prisma.grade.create({ data: dto });
  }

  async deleteGrade(id: number) {
    return this.prisma.grade.delete({ where: { id } });
  }

  // --- Échelles ---
  async getEchelleEchelons(echelleId: number) {
    return this.prisma.echelon.findMany({
      where: { echelleId },
      orderBy: { numero: 'asc' },
    });
  }

  async createEchelle(dto: CreateEchelleDto) {
    return this.prisma.echelle.create({ data: dto });
  }

  async deleteEchelle(id: number) {
    return this.prisma.echelle.delete({ where: { id } });
  }

  // --- Échelons ---
  async createEchelon(dto: CreateEchelonDto) {
    return this.prisma.echelon.create({ data: dto });
  }

  async deleteEchelon(id: number) {
    return this.prisma.echelon.delete({ where: { id } });
  }

  // --- Jours fériés ---
  async getJoursFeries(annee?: number) {
    if (!annee) {
      return this.prisma.jourFerie.findMany({ orderBy: { date: 'asc' } });
    }

    const startOfYear = new Date(`${annee}-01-01`);
    const endOfYear = new Date(`${annee}-12-31`);

    const mobiles = await this.prisma.jourFerie.findMany({
      where: { estMobile: true, date: { gte: startOfYear, lte: endOfYear } },
    });

    const fixes = await this.prisma.jourFerie.findMany({
      where: { estMobile: false },
    });

    const fixesMapped = fixes.map(f => {
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
        date: new Date(dto.date),
        estMobile: dto.estMobile ?? false,
      },
    });
  }

  async deleteJourFerie(id: number) {
    return this.prisma.jourFerie.delete({ where: { id } });
  }

  // --- Structures (organigramme) ---
  async getStructures() {
    return this.prisma.structure.findMany({
      include: { parent: true, enfants: true },
      orderBy: { code: 'asc' },
    });
  }

  async createStructure(dto: CreateStructureDto) {
    return this.prisma.structure.create({
      data: {
        code: dto.code,
        libelleFr: dto.libelleFr,
        libelleAr: dto.libelleAr,
        type: dto.type ?? 'SERVICE',
        parentId: dto.parentId ?? null,
      },
    });
  }

  async deleteStructure(id: number) {
    return this.prisma.structure.delete({ where: { id } });
  }
}