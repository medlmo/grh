import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, StatutDemande, StatutCarriere } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { StructureScopeService } from '../common/services/structure-scope.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private readonly structureScope: StructureScopeService,
  ) {}

  async getStats(user: AuthenticatedUser) {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const anneeEnCours = now.getFullYear();

    // Fenêtre "départs retraite dans ≤ 2 ans" : agents ayant entre 61 et 63 ans, EN_ACTIVITE
    const retraite61 = new Date(now.getFullYear() - 61, now.getMonth(), now.getDate());
    const retraite63 = new Date(now.getFullYear() - 63, now.getMonth(), now.getDate());
    const agentWhere = await this.structureScope.getAgentWhere(user);
    const congeAgentWhere: Prisma.CongeWhereInput = { agent: agentWhere };

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
      this.prisma.agent.count({ where: agentWhere }),
      this.prisma.agent.count({ where: { AND: [agentWhere, { statutCarriere: StatutCarriere.EN_ACTIVITE }] } }),
      this.prisma.agent.groupBy({ by: ['statut'],        where: agentWhere, _count: { _all: true } }),
      this.prisma.agent.groupBy({ by: ['statutCarriere'], where: agentWhere, _count: { _all: true } }),
      this.prisma.agent.groupBy({ by: ['sexe'],          where: agentWhere, _count: { _all: true } }),
      this.prisma.conge.count({
        where: {
          ...congeAgentWhere,
          statut: { in: [StatutDemande.EN_ATTENTE_N1, StatutDemande.EN_ATTENTE_N2, StatutDemande.EN_ATTENTE_DRH] },
        },
      }),
      // Congés approuvés EN COURS aujourd'hui
      this.prisma.conge.count({
        where: {
          statut: StatutDemande.APPROUVEE,
          dateDebut: { lte: todayEnd },
          dateFin:   { gte: todayStart },
          ...congeAgentWhere,
        },
      }),
      // Répartition des demandes de congés par type (exercice en cours, hors refusées/annulées)
      this.prisma.conge.groupBy({
        by: ['type'],
        where: {
          statut: { notIn: [StatutDemande.REFUSEE, StatutDemande.ANNULEE] },
          dateDebut: { gte: new Date(`${anneeEnCours}-01-01`) },
          ...congeAgentWhere,
        },
        _count: { _all: true },
        _sum:   { nombreJours: true },
      }),
      this.prisma.decisionAdmin.count({ where: { dateSignature: null, agent: agentWhere } }),
      // Agents proches de la retraite : 61-63 ans, EN_ACTIVITE
      this.prisma.agent.count({
        where: { AND: [
          agentWhere,
          {
            statutCarriere: StatutCarriere.EN_ACTIVITE,
            dateNaissance: { gte: retraite63, lte: retraite61 },
          },
        ] },
      }),
      this.getPyramideAges(agentWhere),
      this.getRetraitesProches(agentWhere),
      this.prisma.agent.groupBy({
        by: ['structureId'],
        where: agentWhere,
        _count: { _all: true },
        orderBy: { _count: { structureId: 'desc' } },
        take: 8,
      }),
      this.getEvolutionMensuelle(agentWhere),
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

  private async getPyramideAges(agentWhere: Prisma.AgentWhereInput) {
    const agents = await this.prisma.agent.findMany({
      where: agentWhere,
      select: { dateNaissance: true, sexe: true },
    });
    const ORDRE = ['<25', '25-35', '35-45', '45-55', '55-60', '60+'];
    const now = new Date();
    const result = new Map(ORDRE.map((tranche) => [
      tranche,
      { tranche, total: 0, hommes: 0, femmes: 0 },
    ]));
    for (const agent of agents) {
      const age = now.getFullYear() - agent.dateNaissance.getFullYear()
        - (now < new Date(now.getFullYear(), agent.dateNaissance.getMonth(), agent.dateNaissance.getDate()) ? 1 : 0);
      const tranche = age < 25 ? '<25'
        : age < 35 ? '25-35'
          : age < 45 ? '35-45'
            : age < 55 ? '45-55'
              : age < 60 ? '55-60'
                : '60+';
      const row = result.get(tranche)!;
      row.total += 1;
      if (agent.sexe === 'M') row.hommes += 1;
      if (agent.sexe === 'F') row.femmes += 1;
    }
    return ORDRE.map((tranche) => result.get(tranche)!);
  }

  // ─── Évolution mensuelle des demandes (12 derniers mois) ─────────────────

  private async getEvolutionMensuelle(agentWhere: Prisma.AgentWhereInput) {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const conges = await this.prisma.conge.findMany({
      where: { createdAt: { gte: since }, agent: agentWhere },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const totals = new Map<string, number>();
    for (const conge of conges) {
      const mois = conge.createdAt.toISOString().slice(0, 7);
      totals.set(mois, (totals.get(mois) ?? 0) + 1);
    }
    return [...totals.entries()].map(([mois, total]) => ({ mois, total }));
  }

  // ─── Départs à la retraite prochains ──────────────────────────────────────

  private async getRetraitesProches(agentWhere: Prisma.AgentWhereInput) {
    const now = new Date();
    const agents = await this.prisma.agent.findMany({
      where: { AND: [
        agentWhere,
        {
          statutCarriere: StatutCarriere.EN_ACTIVITE,
          // ≥ 58 ans → retraite dans ≤ 5 ans (à 63 ans)
          dateNaissance: { lte: new Date(now.getFullYear() - 58, now.getMonth(), now.getDate()) },
        },
      ] },
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
