import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatutAgent, StatutDemande, StatutCarriere } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalAgents,
      parStatut,
      parSexe,
      parStructure,
      congesEnAttente,
      congesApprouves,
      pyramideAges,
      retraiteProches,
    ] = await Promise.all([
      this.prisma.agent.count(),
      this.prisma.agent.groupBy({ by: ['statut'], _count: true }),
      this.prisma.agent.groupBy({ by: ['sexe'], _count: true }),
      this.prisma.agent.groupBy({ by: ['structureId'], _count: true }),
      this.prisma.conge.count({
        where: {
          statut: {
            in: [StatutDemande.EN_ATTENTE_N1, StatutDemande.EN_ATTENTE_N2, StatutDemande.EN_ATTENTE_DRH],
          },
        },
      }),
      this.prisma.conge.count({ where: { statut: StatutDemande.APPROUVEE } }),
      this.getPyramideAges(),
      this.getRetraitesProches(),
    ]);

    const structures = await this.prisma.structure.findMany();
    const structureMap = new Map(structures.map((s) => [s.id, s]));

    return {
      totalAgents,
      parStatut: parStatut.map((s) => ({ statut: s.statut, count: s._count })),
      parSexe: parSexe.map((s) => ({ sexe: s.sexe, count: s._count })),
      parStructure: parStructure.map((s) => ({
        structure: s.structureId ? structureMap.get(s.structureId)?.libelleFr : 'Non affecté',
        count: s._count,
      })),
      congesEnAttente,
      congesApprouves,
      pyramideAges,
      retraitesProches: retraiteProches,
    };
  }

  private async getPyramideAges() {
    const agents = await this.prisma.agent.findMany({ select: { dateNaissance: true, sexe: true } });
    const tranches = [
      { label: '<25', min: 0, max: 25 },
      { label: '25-35', min: 25, max: 35 },
      { label: '35-45', min: 35, max: 45 },
      { label: '45-55', min: 45, max: 55 },
      { label: '55-60', min: 55, max: 60 },
      { label: '60+', min: 60, max: 200 },
    ];
    const now = new Date();
    return tranches.map((t) => {
      const liste = agents.filter((a) => {
        const age = now.getFullYear() - a.dateNaissance.getFullYear();
        return age >= t.min && age < t.max;
      });
      return {
        tranche: t.label,
        total: liste.length,
        hommes: liste.filter((a) => a.sexe === 'M').length,
        femmes: liste.filter((a) => a.sexe === 'F').length,
      };
    });
  }

  private async getRetraitesProches() {
    const now = new Date();
    const limit = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());
    const agents = await this.prisma.agent.findMany({
      where: {
        statutCarriere: StatutCarriere.EN_ACTIVITE,
        dateNaissance: { lte: new Date(now.getFullYear() - 55, 0, 1) },
      },
      include: { structure: true, grade: true },
      orderBy: { dateNaissance: 'asc' },
    });

    return agents.map((a) => {
      const age = now.getFullYear() - a.dateNaissance.getFullYear();
      const anneeRetraite = a.dateNaissance.getFullYear() + 63;
      return {
        id: a.id,
        matricule: a.matricule,
        nom: `${a.prenomFr} ${a.nomFr}`,
        age,
        anneeRetraite,
        structure: a.structure?.libelleFr,
      };
    });
  }
}
