import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatutDemande, StatutCarriere } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const anneeEnCours = now.getFullYear();

    // Fenêtre "départs retraite dans ≤ 2 ans" : agents ayant entre 61 et 63 ans, EN_ACTIVITE
    const retraite61 = new Date(now.getFullYear() - 61, now.getMonth(), now.getDate());
    const retraite63 = new Date(now.getFullYear() - 63, now.getMonth(), now.getDate());

    const [
      totalAgents,
      agentsEnActivite,
      parStatut,
      parStatutCarriere,
      parSexe,
      congesEnAttente,
      absentsAujourdhui,
      congesParType,
      decisionsNonSignees,
      departsRetraite2ans,
      pyramideAges,
      retraitesProches,
      parStructureRaw,
      evolutionMensuelle,
    ] = await Promise.all([
      this.prisma.agent.count({ where: { deletedAt: null } }),
      this.prisma.agent.count({ where: { deletedAt: null, statutCarriere: StatutCarriere.EN_ACTIVITE } }),
      this.prisma.agent.groupBy({ by: ['statut'],        where: { deletedAt: null }, _count: { _all: true } }),
      this.prisma.agent.groupBy({ by: ['statutCarriere'], where: { deletedAt: null }, _count: { _all: true } }),
      this.prisma.agent.groupBy({ by: ['sexe'],          where: { deletedAt: null }, _count: { _all: true } }),
      this.prisma.conge.count({
        where: { statut: { in: [StatutDemande.EN_ATTENTE_N1, StatutDemande.EN_ATTENTE_N2, StatutDemande.EN_ATTENTE_DRH] } },
      }),
      // Congés approuvés EN COURS aujourd'hui
      this.prisma.conge.count({
        where: {
          statut: StatutDemande.APPROUVEE,
          dateDebut: { lte: todayEnd },
          dateFin:   { gte: todayStart },
        },
      }),
      // Répartition des demandes de congés par type (exercice en cours, hors refusées/annulées)
      this.prisma.conge.groupBy({
        by: ['type'],
        where: {
          statut: { notIn: [StatutDemande.REFUSEE, StatutDemande.ANNULEE] },
          dateDebut: { gte: new Date(`${anneeEnCours}-01-01`) },
        },
        _count: { _all: true },
        _sum:   { nombreJours: true },
      }),
      this.prisma.decisionAdmin.count({ where: { dateSignature: null } }),
      // Agents proches de la retraite : 61-63 ans, EN_ACTIVITE
      this.prisma.agent.count({
        where: {
          deletedAt: null,
          statutCarriere: StatutCarriere.EN_ACTIVITE,
          dateNaissance: { gte: retraite63, lte: retraite61 },
        },
      }),
      this.getPyramideAges(),
      this.getRetraitesProches(),
      this.prisma.agent.groupBy({
        by: ['structureId'],
        where: { deletedAt: null },
        _count: { _all: true },
        orderBy: { _count: { structureId: 'desc' } },
        take: 8,
      }),
      this.getEvolutionMensuelle(),
    ]);

    const structures = await this.prisma.structure.findMany();
    const structureMap = new Map(structures.map((s) => [s.id, s]));

    return {
      totalAgents,
      agentsEnActivite,
      parStatut:         parStatut.map((s)  => ({ statut: s.statut,         count: s._count._all })),
      parStatutCarriere: parStatutCarriere.map((s) => ({ statut: s.statutCarriere, count: s._count._all })),
      parSexe:           parSexe.map((s)    => ({ sexe: s.sexe,              count: s._count._all })),
      congesEnAttente,
      absentsAujourdhui,
      congesParType: congesParType.map((c) => ({
        type:  c.type,
        count: c._count._all,
        jours: c._sum.nombreJours ?? 0,
      })),
      decisionsNonSignees,
      departsRetraite2ans,
      pyramideAges,
      retraitesProches,
      parStructure: parStructureRaw.map((s) => ({
        structure: s.structureId
          ? (structureMap.get(s.structureId)?.libelleFr ?? 'Non affecté')
          : 'Non affecté',
        count: s._count._all,
      })),
      evolutionMensuelle,
    };
  }

  // ─── Pyramide des âges ────────────────────────────────────────────────────

  private async getPyramideAges() {
    type Row = { tranche: string; total: bigint; hommes: bigint; femmes: bigint };

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
      WHERE "deletedAt" IS NULL
      GROUP BY tranche
    `;

    const ORDRE = ['<25', '25-35', '35-45', '45-55', '55-60', '60+'];
    const map = new Map(rows.map((r) => [r.tranche, r]));
    return ORDRE.map((label) => {
      const r = map.get(label);
      return { tranche: label, total: r ? Number(r.total) : 0, hommes: r ? Number(r.hommes) : 0, femmes: r ? Number(r.femmes) : 0 };
    });
  }

  // ─── Évolution mensuelle des demandes (12 derniers mois) ─────────────────

  private async getEvolutionMensuelle() {
    type Row = { mois: Date; total: bigint };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        DATE_TRUNC('month', "createdAt") AS mois,
        COUNT(*) AS total
      FROM "Conge"
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY mois
      ORDER BY mois ASC
    `;
    return rows.map((r) => ({
      mois:  r.mois.toISOString().slice(0, 7), // "2026-01"
      total: Number(r.total),
    }));
  }

  // ─── Départs à la retraite prochains ──────────────────────────────────────

  private async getRetraitesProches() {
    const now = new Date();
    const agents = await this.prisma.agent.findMany({
      where: {
        deletedAt: null,
        statutCarriere: StatutCarriere.EN_ACTIVITE,
        // ≥ 58 ans → retraite dans ≤ 5 ans (à 63 ans)
        dateNaissance: { lte: new Date(now.getFullYear() - 58, now.getMonth(), now.getDate()) },
      },
      select: {
        id: true, matricule: true, nomFr: true, prenomFr: true,
        dateNaissance: true,
        structure: { select: { libelleFr: true } },
        grade:     { select: { libelleFr: true } },
      },
      orderBy: { dateNaissance: 'asc' },
      take: 20,
    });

    return agents.map((a) => {
      const ageExact =
        now.getFullYear() - a.dateNaissance.getFullYear() -
        (now < new Date(now.getFullYear(), a.dateNaissance.getMonth(), a.dateNaissance.getDate()) ? 1 : 0);
      const anneeRetraite = a.dateNaissance.getFullYear() + 63;
      const dansAns = anneeRetraite - now.getFullYear();
      return {
        id: a.id,
        matricule: a.matricule,
        nom: `${a.prenomFr} ${a.nomFr}`,
        age: ageExact,
        anneeRetraite,
        dansAns,
        structure: a.structure?.libelleFr ?? '—',
        grade:     a.grade?.libelleFr     ?? '—',
      };
    });
  }
}
