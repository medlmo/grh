/**
 * CongesService — API publique du module congés.
 * Orchestration uniquement : les règles métier sont dans CongesMetierService,
 * la gestion des soldes dans CongesSoldeService.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCongeDto } from './dto/conge.dto';
import { TypeConge, StatutDemande, Role, Prisma } from '@prisma/client';
import { CongesMetierService } from './conges-metier.service';
import { CongesSoldeService } from './conges-solde.service';

// Re-export pour la compatibilité des contrôleurs existants
export type { SoldeCongeResult } from './conges-solde.service';

/** Rôles autorisés à consulter/annuler les congés de n'importe quel agent. */
const PRIVILEGED_ROLES: string[] = [
  Role.ADMIN,
  Role.DRH,
  Role.CHEF_DIVISION,
  Role.CHEF_SERVICE,
  Role.DIRECTEUR_GENERAL,
  Role.PRESIDENT,
];

const N1_ROLES = [Role.CHEF_SERVICE, Role.CHEF_DIVISION];
const N2_ROLES = [Role.DRH, Role.DIRECTEUR_GENERAL, Role.PRESIDENT];

export interface CongeFilters {
  agentId?: number;
  mine?: boolean;
  statut?: StatutDemande;
  type?: TypeConge;
  structureId?: number;
  debut?: Date;
  fin?: Date;
}

@Injectable()
export class CongesService {
  constructor(
    private prisma: PrismaService,
    private metier: CongesMetierService,
    private solde: CongesSoldeService,
  ) {}

  // ============================================================
  //  Lecture
  // ============================================================

  async findAll(user: { agentId?: number; role: string }, params?: CongeFilters) {
    const where: Prisma.CongeWhereInput = {};

    // mine=true → toujours filtrer sur l'agent connecté (onglet "Mes Congés" pour tous rôles)
    if (params?.mine) {
      where.agentId = user.agentId ?? -1; // -1 retourne vide si pas de profil agent
    } else if (!PRIVILEGED_ROLES.includes(user.role)) {
      // Un agent non-privilégié ne voit que ses propres congés, quel que soit le filtre agentId passé.
      this.requireAgentId(user);
      where.agentId = user.agentId as number;
    } else {
      if (params?.agentId) where.agentId = Number(params.agentId);
    }

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
    return this.prisma.conge.count({ where: { statut: { in: statuts } } });
  }

  async findOne(id: number, user?: { agentId?: number; role: string }) {
    const conge = await this.prisma.conge.findUnique({
      where: { id },
      include: {
        agent: {
          include: { structure: true, grade: true, corps: true },
        },
      },
    });
    if (!conge) throw new NotFoundException('Demande de congé introuvable.');

    // Vérification d'appartenance : un agent simple ne peut voir que ses propres congés.
    if (user && !PRIVILEGED_ROLES.includes(user.role)) {
      this.requireAgentId(user);
      if (conge.agentId !== user.agentId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à consulter cette demande.");
      }
    }

    return conge;
  }

  async getCalendrier(debut: Date, fin: Date, params?: { structureId?: number; type?: TypeConge }) {
    debut = this.metier.stripTime(debut);
    fin = this.metier.stripTime(fin);

    const where: Prisma.CongeWhereInput = {
      statut: { in: [StatutDemande.APPROUVEE] },
      AND: [{ dateDebut: { lte: fin } }, { dateFin: { gte: debut } }],
    };
    if (params?.structureId) where.agent = { structureId: Number(params.structureId) };
    if (params?.type) where.type = params.type;

    return this.prisma.conge.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true, nomFr: true, prenomFr: true, nomAr: true,
            prenomAr: true, matricule: true, structure: true,
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
  //  Création
  // ============================================================

  async create(dto: CreateCongeDto) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: dto.agentId },
      include: { structure: true },
    });
    if (!agent) throw new NotFoundException('Agent introuvable.');

    const dateDebut = this.metier.stripTime(new Date(dto.dateDebut));
    const dateFin = this.metier.stripTime(new Date(dto.dateFin));

    if (dateFin < dateDebut) {
      throw new BadRequestException('La date de fin doit être après la date de début.');
    }

    const config = await this.metier.getTypeConfig(dto.type);
    const nombreJours = await this.metier.calculerJoursOuvrables(dateDebut, dateFin);

    if (nombreJours <= 0) {
      throw new BadRequestException('La période demandée ne contient aucun jour ouvrable.');
    }
    if (config?.dureeMaxJours && nombreJours > config.dureeMaxJours) {
      throw new BadRequestException(
        `Durée maximale autorisée pour ce type : ${config.dureeMaxJours} jours.`,
      );
    }

    await this.metier.verifierReglesMetier({
      agent, type: dto.type, dateDebut, dateFin, nombreJours,
      justificatifUrl: dto.justificatifUrl, config, excludeCongeId: undefined,
    });

    await this.metier.verifierChevauchement(dto.agentId, dateDebut, dateFin);

    return this.prisma.conge.create({
      data: {
        agentId: dto.agentId, type: dto.type, dateDebut, dateFin,
        nombreJours, motif: dto.motif,
        adresseCongeFr: dto.adresseCongeFr, adresseCongeAr: dto.adresseCongeAr,
        justificatifUrl: dto.justificatifUrl,
        statut: StatutDemande.BROUILLON, demandeurId: dto.agentId,
      },
      include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
    });
  }

  // ============================================================
  //  Workflow hiérarchique
  // ============================================================

  async soumettre(id: number, _userId: number) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(conge.statut, [StatutDemande.BROUILLON], 'Seul un brouillon peut être soumis.');

    return this.prisma.conge.update({
      where: { id },
      data: { statut: StatutDemande.EN_ATTENTE_N1, dateSoumission: new Date() },
      include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
    });
  }

  async validerN1(id: number, userId: number, commentaire?: string) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(
      conge.statut, [StatutDemande.EN_ATTENTE_N1],
      "Cette demande n'est pas en attente de validation N1.",
    );

    return this.prisma.conge.update({
      where: { id },
      data: { statut: StatutDemande.EN_ATTENTE_N2, valideN1Par: userId, valideN1Le: new Date(), commentaire },
      include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
    });
  }

  async validerN2(id: number, userId: number, commentaire?: string) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(
      conge.statut, [StatutDemande.EN_ATTENTE_N2],
      "Cette demande n'est pas en attente de validation N2.",
    );

    return this.prisma.$transaction(async (tx) => {
      await this.solde.decompterSolde(tx, conge.agentId, conge.type, conge.nombreJours);
      return tx.conge.update({
        where: { id },
        data: { statut: StatutDemande.APPROUVEE, valideN2Par: userId, valideN2Le: new Date(), commentaire },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      });
    });
  }

  async validerDrh(id: number, userId: number, commentaire?: string) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(
      conge.statut, [StatutDemande.EN_ATTENTE_DRH],
      "Cette demande n'est pas en attente DRH.",
    );

    return this.prisma.$transaction(async (tx) => {
      await this.solde.decompterSolde(tx, conge.agentId, conge.type, conge.nombreJours);
      return tx.conge.update({
        where: { id },
        data: { statut: StatutDemande.APPROUVEE, valideDrhPar: userId, valideDrhLe: new Date(), commentaire },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      });
    });
  }

  async refuser(id: number, userId: number, motifRefus: string) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(
      conge.statut,
      [StatutDemande.EN_ATTENTE_N1, StatutDemande.EN_ATTENTE_N2, StatutDemande.EN_ATTENTE_DRH],
      'Cette demande ne peut plus être refusée.',
    );

    return this.prisma.conge.update({
      where: { id },
      data: { statut: StatutDemande.REFUSEE, refusePar: userId, refuseLe: new Date(), motifRefus },
      include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
    });
  }

  async annuler(id: number, userId: number, user?: { agentId?: number; role: string }) {
    const conge = await this.findOne(id, user);

    // Un agent simple ne peut annuler que ses propres congés.
    if (user && !PRIVILEGED_ROLES.includes(user.role)) {
      this.requireAgentId(user);
      if (conge.agentId !== user.agentId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à annuler cette demande.");
      }
    }

    if (conge.statut === StatutDemande.REFUSEE || conge.statut === StatutDemande.ANNULEE) {
      throw new BadRequestException('Cette demande est déjà close.');
    }

    // Si approuvée → restituer le solde dans une transaction
    if (conge.statut === StatutDemande.APPROUVEE) {
      return this.prisma.$transaction(async (tx) => {
        await this.solde.restituerSolde(tx, conge.agentId, conge.type, conge.nombreJours);
        return tx.conge.update({
          where: { id },
          data: { statut: StatutDemande.ANNULEE },
          include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
        });
      });
    }

    return this.prisma.conge.update({
      where: { id },
      data: { statut: StatutDemande.ANNULEE },
      include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
    });
  }

  // ============================================================
  //  Soldes — délégués à CongesSoldeService
  // ============================================================

  async getSolde(agentId: number) {
    return this.solde.getSolde(agentId);
  }

  async recalculerSolde(agentId: number) {
    return this.solde.recalculerSolde(agentId);
  }

  // ============================================================
  //  Utilitaire privé
  // ============================================================

  private statutsPourRole(role: Role): StatutDemande[] {
    if ((N1_ROLES as readonly string[]).includes(role)) return [StatutDemande.EN_ATTENTE_N1];
    if ((N2_ROLES as readonly string[]).includes(role)) return [StatutDemande.EN_ATTENTE_N2, StatutDemande.EN_ATTENTE_DRH];
    return [];
  }

  /**
   * Lève une ForbiddenException si un utilisateur non-privilégié n'a pas d'agentId associé.
   * Sans cette vérification, Prisma ignorerait un agentId `undefined` et retournerait tous les enregistrements.
   */
  private requireAgentId(user: { agentId?: number; role: string }): asserts user is { agentId: number; role: string } {
    if (user.agentId == null) {
      throw new ForbiddenException("Aucun agent associé à ce compte. Accès refusé.");
    }
  }
}
