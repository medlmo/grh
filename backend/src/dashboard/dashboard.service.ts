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
    type Row = { tranche: string; total: bigint; hommes: bigint; femmes: bigint };

    // Calcul SQL côté Postgres — EXTRACT(YEAR FROM AGE(...)) donne l'âge réel
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateNaissance"))::int < 25 THEN '<25'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateNaissance"))::int < 35 THEN '25-35'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateNaissance"))::int < 45 THEN '35-45'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateNaissance"))::int < 55 THEN '45-55'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateNaissance"))::int < 60 THEN '55-60'
          ELSE '60+'
        END AS tranche,
        COUNT(*)                              AS total,
        COUNT(*) FILTER (WHERE sexe = 'M')   AS hommes,
        COUNT(*) FILTER (WHERE sexe = 'F')   AS femmes
      FROM "Agent"
      GROUP BY tranche
    `;

    // Ordre affiché même si une tranche est vide
    const ORDRE = ['<25', '25-35', '35-45', '45-55', '55-60', '60+'];
    const map = new Map(rows.map((r) => [r.tranche, r]));

    return ORDRE.map((label) => {
      const r = map.get(label);
      return {
        tranche: label,
        total: r ? Number(r.total) : 0,
        hommes: r ? Number(r.hommes) : 0,
        femmes: r ? Number(r.femmes) : 0,
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
