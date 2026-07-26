import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCongeDto } from './dto/conge.dto';
import { TypeConge, StatutDemande, Role, Prisma } from '@prisma/client';

const N1_ROLES = [Role.CHEF_SERVICE, Role.CHEF_DIVISION];
const N2_ROLES = [Role.DRH, Role.DIRECTEUR_GENERAL, Role.PRESIDENT];

export interface CongeFilters {
  agentId?: number;
  statut?: StatutDemande;
  type?: TypeConge;
  structureId?: number;
  debut?: Date;
  fin?: Date;
}

export interface SoldeCongeResult {
  agentId: number;
  droitsAnnuels: number;
  soldeReporte: number;
  prisExercice: number;
  exercice: number;
  restant: number;
  ancienneteAnnees: number;
}

@Injectable()
export class CongesService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  //  Lecture
  // ============================================================

  async findAll(params?: CongeFilters) {
    const where: Prisma.CongeWhereInput = {};

    if (params?.agentId) where.agentId = Number(params.agentId);
    if (params?.statut) where.statut = params.statut;
    if (params?.type) where.type = params.type;
    if (params?.structureId) where.agent = { structureId: Number(params.structureId) };
    if (params?.debut && params?.fin) {
      where.AND = [
        { dateDebut: { lte: params.fin } },
        { dateFin: { gte: params.debut } },
      ];
    }

    return this.prisma.conge.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            matricule: true,
            nomFr: true,
            prenomFr: true,
            nomAr: true,
            prenomAr: true,
            sexe: true,
            structureId: true,
            structure: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAValider(role: Role) {
    const statuts = this.statutsPourRole(role);
    if (statuts.length === 0) return [];

    return this.prisma.conge.findMany({
      where: { statut: { in: statuts } },
      include: {
        agent: {
          select: {
            id: true,
            matricule: true,
            nomFr: true,
            prenomFr: true,
            nomAr: true,
            prenomAr: true,
            sexe: true,
            structureId: true,
            structure: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countAValider(role: Role) {
    const statuts = this.statutsPourRole(role);
    if (statuts.length === 0) return 0;

    return this.prisma.conge.count({
      where: { statut: { in: statuts } },
    });
  }

  private statutsPourRole(role: Role): StatutDemande[] {
    if ((N1_ROLES as readonly string[]).includes(role)) return [StatutDemande.EN_ATTENTE_N1];
    if ((N2_ROLES as readonly string[]).includes(role)) return [StatutDemande.EN_ATTENTE_N2, StatutDemande.EN_ATTENTE_DRH];
    return [];
  }

  async findOne(id: number) {
    const conge = await this.prisma.conge.findUnique({
      where: { id },
      include: {
        agent: {
          include: {
            structure: true,
            grade: true,
            corps: true,
          },
        },
      },
    });
    if (!conge) throw new NotFoundException('Demande de congé introuvable.');
    return conge;
  }

  // ============================================================
  //  Création
  // ============================================================

  async create(dto: CreateCongeDto) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: dto.agentId },
      include: { structure: true },
    });
    if (!agent) throw new NotFoundException('Agent introuvable.');

    const dateDebut = this.stripTime(new Date(dto.dateDebut));
    const dateFin = this.stripTime(new Date(dto.dateFin));

    if (dateFin < dateDebut) {
      throw new BadRequestException('La date de fin doit être après la date de début.');
    }

    const config = await this.getTypeConfig(dto.type);
    const nombreJours = await this.calculerJoursOuvrables(dateDebut, dateFin);

    if (nombreJours <= 0) {
      throw new BadRequestException('La période demandée ne contient aucun jour ouvrable.');
    }

    // Vérifier la durée max
    if (config?.dureeMaxJours && nombreJours > config.dureeMaxJours) {
      throw new BadRequestException(
        `Durée maximale autorisée pour ce type : ${config.dureeMaxJours} jours.`
      );
    }

    // Vérifier les règles métier spécifiques
    await this.verifierReglesMetier({
      agent,
      type: dto.type,
      dateDebut,
      dateFin,
      nombreJours,
      justificatifUrl: dto.justificatifUrl,
      config,
      excludeCongeId: undefined,
    });

    // Vérifier les chevauchements
    await this.verifierChevauchement(dto.agentId, dateDebut, dateFin);

    return this.prisma.conge.create({
      data: {
        agentId: dto.agentId,
        type: dto.type,
        dateDebut,
        dateFin,
        nombreJours,
        motif: dto.motif,
        adresseCongeFr: dto.adresseCongeFr,
        adresseCongeAr: dto.adresseCongeAr,
        justificatifUrl: dto.justificatifUrl,
        statut: StatutDemande.BROUILLON,
        demandeurId: dto.agentId,
      },
      include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
    });
  }

  // ============================================================
  //  Workflow hiérarchique : Agent → Chef de Division → Directeur
  // ============================================================

  async soumettre(id: number, userId: number) {
    const conge = await this.findOne(id);
    this.guardStatut(conge.statut, [StatutDemande.BROUILLON], 'Seul un brouillon peut être soumis.');

    return this.prisma.conge.update({
      where: { id },
      data: {
        statut: StatutDemande.EN_ATTENTE_N1,
        dateSoumission: new Date(),
      },
      include: {
        agent: { select: { id: true, nomFr: true, prenomFr: true } },
      },
    });
  }

  /** Validation N1 : Chef de Division (et Chef de Service si applicable) */
  async validerN1(id: number, userId: number, commentaire?: string) {
    const conge = await this.findOne(id);
    this.guardStatut(
      conge.statut,
      [StatutDemande.EN_ATTENTE_N1],
      "Cette demande n'est pas en attente de validation N1.",
    );

    return this.prisma.conge.update({
      where: { id },
      data: {
        statut: StatutDemande.EN_ATTENTE_N2,
        valideN1Par: userId,
        valideN1Le: new Date(),
        commentaire,
      },
      include: {
        agent: { select: { id: true, nomFr: true, prenomFr: true } },
      },
    });
  }

  /**
   * Validation N2 : Directeur Général (ou DRH) — validation finale.
   * Approuve la demande et décompte le solde si le type est avec solde.
   */
  async validerN2(id: number, userId: number, commentaire?: string) {
    const conge = await this.findOne(id);
    this.guardStatut(
      conge.statut,
      [StatutDemande.EN_ATTENTE_N2],
      "Cette demande n'est pas en attente de validation N2.",
    );

    const approuve = await this.prisma.$transaction(async (tx) => {
      await this.decompterSolde(tx, conge.agentId, conge.type, conge.nombreJours);

      return tx.conge.update({
        where: { id },
        data: {
          statut: StatutDemande.APPROUVEE,
          valideN2Par: userId,
          valideN2Le: new Date(),
          commentaire,
        },
        include: {
          agent: { select: { id: true, nomFr: true, prenomFr: true } },
        },
      });
    });

    return approuve;
  }

  /**
   * Validation DRH : chemin alternatif final (EN_ATTENTE_DRH).
   * Permet de conserver le statut intermédiaire DRH si un arrêté de service
   * prévoit une relecture RH avant approbation définitive.
   */
  async validerDrh(id: number, userId: number, commentaire?: string) {
    const conge = await this.findOne(id);
    this.guardStatut(
      conge.statut,
      [StatutDemande.EN_ATTENTE_DRH],
      "Cette demande n'est pas en attente DRH.",
    );

    const approuve = await this.prisma.$transaction(async (tx) => {
      await this.decompterSolde(tx, conge.agentId, conge.type, conge.nombreJours);

      return tx.conge.update({
        where: { id },
        data: {
          statut: StatutDemande.APPROUVEE,
          valideDrhPar: userId,
          valideDrhLe: new Date(),
          commentaire,
        },
        include: {
          agent: { select: { id: true, nomFr: true, prenomFr: true } },
        },
      });
    });

    return approuve;
  }

  async refuser(id: number, userId: number, motifRefus: string) {
    const conge = await this.findOne(id);
    this.guardStatut(
      conge.statut,
      [StatutDemande.EN_ATTENTE_N1, StatutDemande.EN_ATTENTE_N2, StatutDemande.EN_ATTENTE_DRH],
      'Cette demande ne peut plus être refusée.',
    );

    return this.prisma.conge.update({
      where: { id },
      data: {
        statut: StatutDemande.REFUSEE,
        refusePar: userId,
        refuseLe: new Date(),
        motifRefus,
      },
      include: {
        agent: { select: { id: true, nomFr: true, prenomFr: true } },
      },
    });
  }

  async annuler(id: number, userId: number) {
    const conge = await this.findOne(id);

    // Une demande déjà refusée ou annulée ne peut plus être annulée
    if (conge.statut === StatutDemande.REFUSEE || conge.statut === StatutDemande.ANNULEE) {
      throw new BadRequestException('Cette demande est déjà close.');
    }

    // Si la demande est déjà approuvée, on restitue le solde consommé
    if (conge.statut === StatutDemande.APPROUVEE) {
      const config = await this.getTypeConfig(conge.type);
      if (config?.avecSolde) {
        await this.prisma.soldeConge.update({
          where: { agentId: conge.agentId },
          data: { prisExercice: { decrement: conge.nombreJours } },
        });
      }
    }

    return this.prisma.conge.update({
      where: { id },
      data: { statut: StatutDemande.ANNULEE },
      include: {
        agent: { select: { id: true, nomFr: true, prenomFr: true } },
      },
    });
  }

  // ============================================================
  //  Solde de congés annuels selon ancienneté
  // ============================================================

  async getSolde(agentId: number): Promise<SoldeCongeResult> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });
    if (!agent) throw new NotFoundException('Agent introuvable.');

    const anneeEnCours = new Date().getFullYear();

    let solde = await this.prisma.soldeConge.findUnique({
      where: { agentId },
    });

    const ancienneteAnnees = this.calculerAnciennete(agent.dateRecrutement);
    const droits = this.calculerDroitsAnnuels(ancienneteAnnees);

    if (!solde || solde.exercice !== anneeEnCours) {
      // Nouvel exercice ou première création : report du reliquat (plafonné à 22 jours)
      const reporte = solde
        ? Math.min(solde.droitsAnnuels + solde.soldeReporte - solde.prisExercice, 22)
        : 0;
      solde = await this.prisma.soldeConge.upsert({
        where: { agentId },
        update: {
          droitsAnnuels: droits,
          soldeReporte: reporte,
          prisExercice: 0,
          exercice: anneeEnCours,
          updatedAt: new Date(),
        },
        create: {
          agentId,
          droitsAnnuels: droits,
          soldeReporte: reporte,
          prisExercice: 0,
          exercice: anneeEnCours,
        },
      });
    }

    return {
      agentId,
      droitsAnnuels: solde.droitsAnnuels,
      soldeReporte: solde.soldeReporte,
      prisExercice: solde.prisExercice,
      exercice: solde.exercice,
      restant: parseFloat(
        (solde.droitsAnnuels + solde.soldeReporte - solde.prisExercice).toFixed(2),
      ),
      ancienneteAnnees,
    };
  }

  /** Recalcule et met à jour les droits annuels de l'agent (utile après correction de la date de recrutement). */
  async recalculerSolde(agentId: number) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent introuvable.');

    const ancienneteAnnees = this.calculerAnciennete(agent.dateRecrutement);
    const droits = this.calculerDroitsAnnuels(ancienneteAnnees);

    return this.prisma.soldeConge.update({
      where: { agentId },
      data: { droitsAnnuels: droits, updatedAt: new Date() },
    });
  }

  // ============================================================
  //  Calendrier collectif des absences
  // ============================================================

  async getCalendrier(debut: Date, fin: Date, params?: { structureId?: number; type?: TypeConge }) {
    debut = this.stripTime(debut);
    fin = this.stripTime(fin);

    const where: Prisma.CongeWhereInput = {
      statut: { in: [StatutDemande.APPROUVEE] },
      AND: [{ dateDebut: { lte: fin } }, { dateFin: { gte: debut } }],
    };

    if (params?.structureId) {
      where.agent = { structureId: Number(params.structureId) };
    }
    if (params?.type) {
      where.type = params.type;
    }

    return this.prisma.conge.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            nomFr: true,
            prenomFr: true,
            nomAr: true,
            prenomAr: true,
            matricule: true,
            structure: true,
          },
        },
      },
      orderBy: { dateDebut: 'asc' },
    });
  }

  async getTypesConge() {
    return this.prisma.typeCongeConfig.findMany({ orderBy: { type: 'asc' } });
  }

  // ============================================================
  //  Règles métier internes
  // ============================================================

  private async verifierReglesMetier(ctx: {
    agent: any;
    type: TypeConge;
    dateDebut: Date;
    dateFin: Date;
    nombreJours: number;
    justificatifUrl?: string;
    config?: any;
    excludeCongeId?: number;
  }) {
    const { agent, type, nombreJours, justificatifUrl, config, excludeCongeId } = ctx;

    // Justificatif géré hors-ligne ou par un autre processus
    // (Ancienne validation stricte supprimée suite à la suppression du champ UI)

    switch (type) {
      case TypeConge.ANNUEL:
        const solde = await this.getSolde(agent.id);
        if (nombreJours > solde.restant) {
          throw new BadRequestException(
            `Solde de congés annuels insuffisant. Disponible : ${solde.restant} jours, demandé : ${nombreJours} jours.`
          );
        }
        // Fractionnement : à titre informatif, pas de blocage
        if (nombreJours < 1) {
          throw new BadRequestException('Un congé annuel doit durer au moins 1 jour.');
        }
        break;

      case TypeConge.MALADIE_COURTE:
      case TypeConge.MALADIE_MOYENNE:
      case TypeConge.MALADIE_LONGUE:
        // Art. 43 : Maladie courte durée ≤ 6 mois (180 jours) par période de 12 mois
        if (type === TypeConge.MALADIE_COURTE && nombreJours > 180) {
          throw new BadRequestException(
            'Un congé de maladie courte durée ne peut excéder 6 mois (180 jours) par période de 12 mois consécutifs (Art. 43).'
          );
        }
        // Art. 44 : Maladie moyenne durée ≤ 3 ans (1095 jours)
        if (type === TypeConge.MALADIE_MOYENNE) {
          const prisMoyenne = await this.sumJoursCarriere(
            agent.id,
            [TypeConge.MALADIE_MOYENNE],
            excludeCongeId,
          );
          if (prisMoyenne + nombreJours > 1095) {
            throw new BadRequestException(
              `Plafond de congé de maladie moyenne durée dépassé (3 ans max). Déjà pris : ${prisMoyenne} jours (Art. 44).`
            );
          }
        }
        // Art. 45 : Maladie longue durée ≤ 5 ans (1825 jours)
        if (type === TypeConge.MALADIE_LONGUE) {
          const prisLongue = await this.sumJoursCarriere(
            agent.id,
            [TypeConge.MALADIE_LONGUE],
            excludeCongeId,
          );
          if (prisLongue + nombreJours > 1825) {
            throw new BadRequestException(
              `Plafond de congé de maladie longue durée dépassé (5 ans max). Déjà pris : ${prisLongue} jours (Art. 45).`
            );
          }
        }
        break;

      case TypeConge.MATERNITE:
        if (agent.sexe !== 'F') {
          throw new BadRequestException('Le congé de maternité est réservé aux agentes.');
        }
        // Durée maximale 98 jours selon la législation marocaine (14 semaines)
        if (nombreJours > 98) {
          throw new BadRequestException('La durée maximale du congé de maternité est de 98 jours.');
        }
        break;

      case TypeConge.PATERNITE:
        if (agent.sexe !== 'M') {
          throw new BadRequestException('Le congé de paternité est réservé aux agents masculins.');
        }
        // Loi n° 30-22 : 15 jours continus rémunérés pour les fonctionnaires
        if (nombreJours > 15) {
          throw new BadRequestException('La durée maximale du congé de paternité est de 15 jours continus (Loi 30-22).');
        }
        break;

      case TypeConge.AUTORISATION_ABSENCE:
        if (nombreJours > 3) {
          throw new BadRequestException('Une autorisation d\'absence ne peut excéder 3 jours.');
        }
        const autorisationsMois = await this.countCongesDansMois(
          agent.id,
          TypeConge.AUTORISATION_ABSENCE,
          ctx.dateDebut,
          excludeCongeId,
        );
        if (autorisationsMois >= 2) {
          throw new BadRequestException('Limite de 2 autorisations d\'absence par mois atteinte.');
        }
        break;

      case TypeConge.EXCEPTIONNEL:
        const prisExceptionnel = await this.sumJoursDansExercice(
          agent.id,
          [TypeConge.EXCEPTIONNEL],
          excludeCongeId,
        );
        // Art. 41 : jusqu'à 10 jours pour motifs familiaux ou graves
        if (prisExceptionnel + nombreJours > 10) {
          throw new BadRequestException(
            `Plafond annuel de congés exceptionnels dépassé (10 jours/an, Art. 41). Déjà pris : ${prisExceptionnel} jours.`
          );
        }
        break;

      case TypeConge.SANS_SOLDE:
        // Art. 46 : congé sans solde limité à 1 mois, accordé exceptionnellement
        // une seule fois tous les 2 ans
        if (nombreJours > 30) {
          throw new BadRequestException('Un congé sans solde ne peut excéder 1 mois (30 jours) selon l\'Art. 46.');
        }
        break;

      default:
        break;
    }
  }

  private async verifierChevauchement(agentId: number, debut: Date, fin: Date, excludeId?: number) {
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
        'Cette période chevauche une autre demande de congé ou absence existante.'
      );
    }
  }

  private async decompterSolde(
    tx: Prisma.TransactionClient,
    agentId: number,
    type: TypeConge,
    nombreJours: number,
  ) {
    const config = await tx.typeCongeConfig.findUnique({ where: { type } });
    if (!config?.avecSolde) return;

    await tx.soldeConge.update({
      where: { agentId },
      data: { prisExercice: { increment: nombreJours } },
    });
  }

  private async getTypeConfig(type: TypeConge) {
    return this.prisma.typeCongeConfig.findUnique({
      where: { type },
    });
  }

  private async sumJoursDansExercice(
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

  /** Somme des jours de congé sur toute la carrière (pour maladie moyenne/longue durée). */
  private async sumJoursCarriere(
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

  private async countCongesDansMois(
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
  //  Calculs d'ancienneté et de jours
  // ============================================================

  private calculerAnciennete(dateRecrutement: Date): number {
    const ms = Date.now() - new Date(dateRecrutement).getTime();
    return Math.max(0, Math.floor(ms / (365.25 * 24 * 3600 * 1000)));
  }

  private calculerDroitsAnnuels(annees: number): number {
    // Art. 40 du Dahir 1-58-008 : 22 jours ouvrables par année de service
    return 22;
  }

  private async calculerJoursOuvrables(debut: Date, fin: Date): Promise<number> {
    debut = this.stripTime(debut);
    fin = this.stripTime(fin);

    const mobiles = await this.prisma.jourFerie.findMany({
      where: {
        date: { gte: debut, lte: fin },
        estMobile: true,
      },
    });

    const fixes = await this.prisma.jourFerie.findMany({
      where: { estMobile: false },
    });

    const mobileDates = new Set(mobiles.map((r) => this.stripTime(r.date).toISOString()));
    const fixedDayMonths = new Set(fixes.map((r) => {
      const d = this.stripTime(r.date);
      return `${d.getMonth()}-${d.getDate()}`;
    }));

    let count = 0;
    const cur = new Date(debut);
    while (cur <= fin) {
      const day = cur.getDay();
      const isWeekend = day === 0 || day === 6; // Samedi, Dimanche
      
      const curIso = cur.toISOString();
      const curDayMonth = `${cur.getMonth()}-${cur.getDate()}`;
      
      const isFerie = mobileDates.has(curIso) || fixedDayMonths.has(curDayMonth);

      if (!isWeekend && !isFerie) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  private stripTime(d: Date): Date {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private guardStatut(actuel: StatutDemande, attendus: StatutDemande[], message: string) {
    if (!attendus.includes(actuel)) {
      throw new BadRequestException(message);
    }
  }
}
