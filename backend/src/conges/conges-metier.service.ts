/**
 * CongesMetierService — Règles métier et calculs liés aux congés.
 * Extrait de CongesService : validation, chevauchement, jours ouvrables.
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypeConge, StatutDemande, Prisma } from '@prisma/client';
import { CongesSoldeService } from './conges-solde.service';

@Injectable()
export class CongesMetierService {
  constructor(
    private prisma: PrismaService,
    private soldeService: CongesSoldeService,
  ) {}

  // ============================================================
  //  Validation des règles métier par type de congé
  // ============================================================

  async verifierReglesMetier(ctx: {
    agent: any;
    type: TypeConge;
    dateDebut: Date;
    dateFin: Date;
    nombreJours: number;
    justificatifUrl?: string;
    config?: any;
    excludeCongeId?: number;
  }) {
    const { agent, type, nombreJours, excludeCongeId } = ctx;

    switch (type) {
      case TypeConge.ANNUEL: {
        const solde = await this.soldeService.getSolde(agent.id);
        if (nombreJours > solde.restant) {
          throw new BadRequestException(
            `Solde de congés annuels insuffisant. Disponible : ${solde.restant} jours, demandé : ${nombreJours} jours.`,
          );
        }
        if (nombreJours < 1) {
          throw new BadRequestException('Un congé annuel doit durer au moins 1 jour.');
        }
        break;
      }

      case TypeConge.MALADIE_COURTE:
      case TypeConge.MALADIE_MOYENNE:
      case TypeConge.MALADIE_LONGUE:
        // Art. 43 : Maladie courte ≤ 6 mois par période de 12 mois
        if (type === TypeConge.MALADIE_COURTE && nombreJours > 180) {
          throw new BadRequestException(
            'Un congé de maladie courte durée ne peut excéder 6 mois (180 jours) par période de 12 mois (Art. 43).',
          );
        }
        // Art. 44 : Maladie moyenne ≤ 3 ans sur toute la carrière
        if (type === TypeConge.MALADIE_MOYENNE) {
          const prisMoyenne = await this.sumJoursCarriere(agent.id, [TypeConge.MALADIE_MOYENNE], excludeCongeId);
          if (prisMoyenne + nombreJours > 1095) {
            throw new BadRequestException(
              `Plafond de congé de maladie moyenne durée dépassé (3 ans max). Déjà pris : ${prisMoyenne} jours (Art. 44).`,
            );
          }
        }
        // Art. 45 : Maladie longue ≤ 5 ans sur toute la carrière
        if (type === TypeConge.MALADIE_LONGUE) {
          const prisLongue = await this.sumJoursCarriere(agent.id, [TypeConge.MALADIE_LONGUE], excludeCongeId);
          if (prisLongue + nombreJours > 1825) {
            throw new BadRequestException(
              `Plafond de congé de maladie longue durée dépassé (5 ans max). Déjà pris : ${prisLongue} jours (Art. 45).`,
            );
          }
        }
        break;

      case TypeConge.MATERNITE:
        if (agent.sexe !== 'F') {
          throw new BadRequestException('Le congé de maternité est réservé aux agentes.');
        }
        if (nombreJours > 98) {
          throw new BadRequestException('La durée maximale du congé de maternité est de 98 jours.');
        }
        break;

      case TypeConge.PATERNITE:
        if (agent.sexe !== 'M') {
          throw new BadRequestException('Le congé de paternité est réservé aux agents masculins.');
        }
        if (nombreJours > 15) {
          throw new BadRequestException('La durée maximale du congé de paternité est de 15 jours (Loi 30-22).');
        }
        break;

      case TypeConge.AUTORISATION_ABSENCE: {
        if (nombreJours > 3) {
          throw new BadRequestException("Une autorisation d'absence ne peut excéder 3 jours.");
        }
        const autorisationsMois = await this.countCongesDansMois(
          agent.id,
          TypeConge.AUTORISATION_ABSENCE,
          ctx.dateDebut,
          excludeCongeId,
        );
        if (autorisationsMois >= 2) {
          throw new BadRequestException("Limite de 2 autorisations d'absence par mois atteinte.");
        }
        break;
      }

      case TypeConge.EXCEPTIONNEL: {
        const prisExceptionnel = await this.sumJoursDansExercice(agent.id, [TypeConge.EXCEPTIONNEL], excludeCongeId);
        // Art. 41 : jusqu'à 10 jours pour motifs familiaux ou graves
        if (prisExceptionnel + nombreJours > 10) {
          throw new BadRequestException(
            `Plafond annuel de congés exceptionnels dépassé (10 j/an, Art. 41). Déjà pris : ${prisExceptionnel} jours.`,
          );
        }
        break;
      }

      case TypeConge.SANS_SOLDE:
        // Art. 46 : limité à 1 mois, accordé exceptionnellement
        if (nombreJours > 30) {
          throw new BadRequestException(
            "Un congé sans solde ne peut excéder 1 mois (30 jours) selon l'Art. 46.",
          );
        }
        break;

      default:
        break;
    }
  }

  async verifierChevauchement(agentId: number, debut: Date, fin: Date, excludeId?: number) {
    const chevauchements = await this.prisma.conge.findMany({
      where: {
        agentId,
        id: excludeId ? { not: excludeId } : undefined,
        statut: { notIn: [StatutDemande.REFUSEE, StatutDemande.ANNULEE] },
        AND: [{ dateDebut: { lte: fin } }, { dateFin: { gte: debut } }],
      },
    });
    if (chevauchements.length > 0) {
      throw new BadRequestException(
        'Cette période chevauche une autre demande de congé ou absence existante.',
      );
    }
  }

  async getTypeConfig(type: TypeConge) {
    return this.prisma.typeCongeConfig.findUnique({ where: { type } });
  }

  // ============================================================
  //  Calcul des jours ouvrables (hors week-end et jours fériés)
  // ============================================================

  async calculerJoursOuvrables(debut: Date, fin: Date): Promise<number> {
    debut = this.stripTime(debut);
    fin = this.stripTime(fin);

    const [mobiles, fixes] = await Promise.all([
      this.prisma.jourFerie.findMany({ where: { date: { gte: debut, lte: fin }, estMobile: true } }),
      this.prisma.jourFerie.findMany({ where: { estMobile: false } }),
    ]);

    const mobileDates = new Set(mobiles.map((r) => this.stripTime(r.date).toISOString()));
    const fixedDayMonths = new Set(
      fixes.map((r) => {
        const d = this.stripTime(r.date);
        return `${d.getMonth()}-${d.getDate()}`;
      }),
    );

    let count = 0;
    const cur = new Date(debut);
    while (cur <= fin) {
      const day = cur.getDay();
      const isWeekend = day === 0 || day === 6;
      const isFerie =
        mobileDates.has(cur.toISOString()) ||
        fixedDayMonths.has(`${cur.getMonth()}-${cur.getDate()}`);
      if (!isWeekend && !isFerie) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // ============================================================
  //  Agrégats Prisma (réutilisés par les règles métier)
  // ============================================================

  async sumJoursDansExercice(
    agentId: number,
    types: TypeConge[],
    excludeCongeId?: number,
  ): Promise<number> {
    const exercice = new Date().getFullYear();
    const result = await this.prisma.conge.aggregate({
      where: {
        agentId,
        type: { in: types },
        statut: { notIn: [StatutDemande.REFUSEE, StatutDemande.ANNULEE] },
        id: excludeCongeId ? { not: excludeCongeId } : undefined,
        OR: [
          { dateDebut: { gte: new Date(`${exercice}-01-01`) } },
          { dateFin: { gte: new Date(`${exercice}-01-01`) } },
        ],
      },
      _sum: { nombreJours: true },
    });
    return result._sum.nombreJours || 0;
  }

  async sumJoursCarriere(
    agentId: number,
    types: TypeConge[],
    excludeCongeId?: number,
  ): Promise<number> {
    const result = await this.prisma.conge.aggregate({
      where: {
        agentId,
        type: { in: types },
        statut: { notIn: [StatutDemande.REFUSEE, StatutDemande.ANNULEE] },
        id: excludeCongeId ? { not: excludeCongeId } : undefined,
      },
      _sum: { nombreJours: true },
    });
    return result._sum.nombreJours || 0;
  }

  async countCongesDansMois(
    agentId: number,
    type: TypeConge,
    dateRef: Date,
    excludeCongeId?: number,
  ): Promise<number> {
    const debutMois = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1);
    const finMois = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0, 23, 59, 59);
    return this.prisma.conge.count({
      where: {
        agentId,
        type,
        id: excludeCongeId ? { not: excludeCongeId } : undefined,
        statut: { notIn: [StatutDemande.REFUSEE, StatutDemande.ANNULEE] },
        AND: [{ dateDebut: { lte: finMois } }, { dateFin: { gte: debutMois } }],
      },
    });
  }

  // ============================================================
  //  Utilitaires
  // ============================================================

  stripTime(d: Date): Date {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  guardStatut(actuel: StatutDemande, attendus: StatutDemande[], message: string) {
    if (!attendus.includes(actuel)) {
      throw new BadRequestException(message);
    }
  }
}
