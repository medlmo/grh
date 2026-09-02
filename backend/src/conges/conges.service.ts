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
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCongeDto } from './dto/conge.dto';
import { TypeConge, StatutDemande, Role, Prisma } from '@prisma/client';
import { CongesMetierService } from './conges-metier.service';
import { CongesSoldeService } from './conges-solde.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

// Re-export pour la compatibilité des contrôleurs existants
export type { SoldeCongeResult } from './conges-solde.service';

export interface CongesUser {
  id: number;
  agentId?: number;
  role: Role | string;
}

/** Rôles dont le périmètre congés est global. */
const GLOBAL_CONGE_ROLES: string[] = [
  Role.ADMIN,
  Role.DRH,
  Role.DIRECTEUR_GENERAL,
  Role.PRESIDENT,
];

const N1_ROLES = [Role.CHEF_SERVICE, Role.CHEF_DIVISION];
const N2_ROLES = [Role.DRH, Role.DIRECTEUR_GENERAL, Role.PRESIDENT];
const CONGE_CREATION_PRIVILEGED_ROLES: Role[] = [Role.ADMIN, Role.DRH];

export interface CongeFilters {
  agentId?: number;
  mine?: boolean;
  statut?: StatutDemande;
  type?: TypeConge;
  structureId?: number;
  debut?: Date;
  fin?: Date;
  page: number;
  limit: number;
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

  async findAll(user: CongesUser, params: CongeFilters) {
    const where: Prisma.CongeWhereInput = {};
    let scopedStructureIds: number[] | undefined;

    // mine=true → toujours filtrer sur l'agent connecté (onglet "Mes Congés" pour tous rôles)
    if (params.mine) {
      where.agentId = user.agentId ?? -1; // -1 retourne vide si pas de profil agent
    } else if ((N1_ROLES as readonly string[]).includes(user.role)) {
      scopedStructureIds = await this.getN1StructureScope(user);
      if (params.agentId) where.agentId = Number(params.agentId);
    } else if (!GLOBAL_CONGE_ROLES.includes(user.role)) {
      // Un agent non-privilégié ne voit que ses propres congés, quel que soit le filtre agentId passé.
      this.requireAgentId(user);
      where.agentId = user.agentId as number;
    } else {
      if (params.agentId) where.agentId = Number(params.agentId);
    }

    if (params.statut) where.statut = params.statut;
    if (params.type) where.type = params.type;
    if (scopedStructureIds) {
      where.agent = params.structureId && scopedStructureIds.includes(Number(params.structureId))
        ? { structureId: Number(params.structureId), deletedAt: null }
        : params.structureId
          ? { structureId: { in: [] } }
          : { structureId: { in: scopedStructureIds }, deletedAt: null };
    } else if (params.structureId) {
      where.agent = { structureId: Number(params.structureId) };
    }
    if (params.debut && params.fin) {
      where.AND = [
        { dateDebut: { lte: params.fin } },
        { dateFin: { gte: params.debut } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.conge.findMany({
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
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.conge.count({ where }),
    ]);
    return this.paginate(data, total, params.page, params.limit);
  }

  async findAValider(user: CongesUser, params: PaginationQueryDto) {
    const statuts = this.statutsPourRole(user.role as Role);
    if (statuts.length === 0) return this.paginate([], 0, params.page, params.limit);

    const where = await this.buildValidationWhere(user, statuts);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.conge.findMany({
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
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.conge.count({ where }),
    ]);
    return this.paginate(data, total, params.page, params.limit);
  }

  async countAValider(user: CongesUser) {
    const statuts = this.statutsPourRole(user.role as Role);
    if (statuts.length === 0) return 0;
    return this.prisma.conge.count({
      where: await this.buildValidationWhere(user, statuts),
    });
  }

  async findOne(id: number, user?: CongesUser) {
    const conge = await this.prisma.conge.findUnique({
      where: { id },
      include: {
        agent: {
          include: { structure: true, grade: true, corps: true },
        },
      },
    });
    if (!conge) throw new NotFoundException('Demande de congé introuvable.');

    if (user && !GLOBAL_CONGE_ROLES.includes(user.role)) {
      if ((N1_ROLES as readonly string[]).includes(user.role)) {
        await this.assertStructureInN1Scope(user, conge.agent.structureId);
      } else {
        this.requireAgentId(user);
        if (conge.agentId !== user.agentId) {
          throw new ForbiddenException("Vous n'êtes pas autorisé à consulter cette demande.");
        }
      }
    }

    return conge;
  }

  async getCalendrier(
    user: CongesUser,
    debut: Date,
    fin: Date,
    params?: { structureId?: number; type?: TypeConge },
    pagination: PaginationQueryDto = new PaginationQueryDto(),
  ) {
    debut = this.metier.stripTime(debut);
    fin = this.metier.stripTime(fin);

    const where: Prisma.CongeWhereInput = {
      statut: { in: [StatutDemande.APPROUVEE] },
      AND: [{ dateDebut: { lte: fin } }, { dateFin: { gte: debut } }],
    };
    if ((N1_ROLES as readonly string[]).includes(user.role)) {
      const scope = await this.getN1StructureScope(user);
      where.agent = params?.structureId && scope.includes(Number(params.structureId))
        ? { structureId: Number(params.structureId), deletedAt: null }
        : params?.structureId
          ? { structureId: { in: [] } }
          : { structureId: { in: scope }, deletedAt: null };
      if (params?.type) where.type = params.type;
    } else if (!GLOBAL_CONGE_ROLES.includes(user.role)) {
      this.requireAgentId(user);
      where.agentId = user.agentId;
    } else {
      if (params?.structureId) where.agent = { structureId: Number(params.structureId) };
      if (params?.type) where.type = params.type;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.conge.findMany({
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
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.conge.count({ where }),
    ]);
    return this.paginate(data, total, pagination.page, pagination.limit);
  }

  async getTypesConge(pagination: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.typeCongeConfig.findMany({
        orderBy: { type: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.typeCongeConfig.count(),
    ]);
    return this.paginate(data, total, pagination.page, pagination.limit);
  }

  // ============================================================
  //  Création
  // ============================================================

  async create(dto: CreateCongeDto, user: CongesUser) {
    const canCreateForAnyAgent = CONGE_CREATION_PRIVILEGED_ROLES.includes(user.role as Role);
    if (!canCreateForAnyAgent) {
      this.requireAgentId(user);
      if (dto.agentId !== user.agentId) {
        throw new ForbiddenException(
          "Vous n'êtes pas autorisé à créer une demande pour cet agent.",
        );
      }
    }

    const agentId = dto.agentId;
    if (agentId == null) {
      throw new BadRequestException("L'agent concerné est requis.");
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { structure: true },
    });
    if (!agent || agent.deletedAt) throw new NotFoundException('Agent introuvable.');

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

    await this.metier.verifierChevauchement(agentId, dateDebut, dateFin);

    return this.prisma.$transaction((tx) =>
      tx.conge.create({
        data: {
          agentId, type: dto.type, dateDebut, dateFin,
          nombreJours, motif: dto.motif,
          adresseCongeFr: dto.adresseCongeFr, adresseCongeAr: dto.adresseCongeAr,
          justificatifUrl: dto.justificatifUrl,
          statut: StatutDemande.BROUILLON, demandeurId: agentId,
        },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      }),
    );
  }

  // ============================================================
  //  Workflow hiérarchique
  // ============================================================

  async soumettre(id: number, user: CongesUser) {
    const conge = await this.findOne(id);
    this.assertOwnConge(conge.agentId, user, 'soumettre');
    this.metier.guardStatut(conge.statut, [StatutDemande.BROUILLON], 'Seul un brouillon peut être soumis.');

    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.conge.updateMany({
        where: { id, statut: StatutDemande.BROUILLON },
        data: { statut: StatutDemande.EN_ATTENTE_N1, dateSoumission: new Date() },
      });
      this.assertTransitionApplied(transition.count);
      return tx.conge.findUniqueOrThrow({
        where: { id },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      });
    });
  }

  async validerN1(id: number, user: CongesUser, commentaire?: string) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(
      conge.statut, [StatutDemande.EN_ATTENTE_N1],
      "Cette demande n'est pas en attente de validation N1.",
    );
    await this.assertCanValidate(user, conge.agent.structureId, 'N1');

    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.conge.updateMany({
        where: { id, statut: StatutDemande.EN_ATTENTE_N1 },
        data: { statut: StatutDemande.EN_ATTENTE_N2, valideN1Par: user.id, valideN1Le: new Date(), commentaire },
      });
      this.assertTransitionApplied(transition.count);
      return tx.conge.findUniqueOrThrow({
        where: { id },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      });
    });
  }

  async validerN2(id: number, user: CongesUser, commentaire?: string) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(
      conge.statut, [StatutDemande.EN_ATTENTE_N2],
      "Cette demande n'est pas en attente de validation N2.",
    );
    await this.assertCanValidate(user, conge.agent.structureId, 'N2');

    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.conge.updateMany({
        where: { id, statut: StatutDemande.EN_ATTENTE_N2 },
        data: { statut: StatutDemande.APPROUVEE, valideN2Par: user.id, valideN2Le: new Date(), commentaire },
      });
      this.assertTransitionApplied(transition.count);
      await this.solde.decompterSolde(tx, conge.agentId, conge.type, conge.nombreJours);
      return tx.conge.findUniqueOrThrow({
        where: { id },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      });
    });
  }

  async validerDrh(id: number, user: CongesUser, commentaire?: string) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(
      conge.statut, [StatutDemande.EN_ATTENTE_DRH],
      "Cette demande n'est pas en attente DRH.",
    );
    await this.assertCanValidate(user, conge.agent.structureId, 'N2');

    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.conge.updateMany({
        where: { id, statut: StatutDemande.EN_ATTENTE_DRH },
        data: { statut: StatutDemande.APPROUVEE, valideDrhPar: user.id, valideDrhLe: new Date(), commentaire },
      });
      this.assertTransitionApplied(transition.count);
      await this.solde.decompterSolde(tx, conge.agentId, conge.type, conge.nombreJours);
      return tx.conge.findUniqueOrThrow({
        where: { id },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      });
    });
  }

  async refuser(id: number, user: CongesUser, motifRefus: string) {
    const conge = await this.findOne(id);
    this.metier.guardStatut(
      conge.statut,
      [StatutDemande.EN_ATTENTE_N1, StatutDemande.EN_ATTENTE_N2, StatutDemande.EN_ATTENTE_DRH],
      'Cette demande ne peut plus être refusée.',
    );
    await this.assertCanValidate(
      user,
      conge.agent.structureId,
      conge.statut === StatutDemande.EN_ATTENTE_N1 ? 'N1' : 'N2',
    );

    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.conge.updateMany({
        where: { id, statut: conge.statut },
        data: { statut: StatutDemande.REFUSEE, refusePar: user.id, refuseLe: new Date(), motifRefus },
      });
      this.assertTransitionApplied(transition.count);
      return tx.conge.findUniqueOrThrow({
        where: { id },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      });
    });
  }

  async annuler(id: number, userId: number, user: CongesUser) {
    const conge = await this.findOne(id);

    // Seul le propriétaire peut annuler sa propre demande (tous rôles confondus).
    this.assertOwnConge(conge.agentId, user, 'annuler');

    if (conge.statut === StatutDemande.REFUSEE || conge.statut === StatutDemande.ANNULEE) {
      throw new BadRequestException('Cette demande est déjà close.');
    }

    // Si approuvée → restituer le solde dans une transaction
    if (conge.statut === StatutDemande.APPROUVEE) {
      return this.prisma.$transaction(async (tx) => {
        const transition = await tx.conge.updateMany({
          where: { id, statut: StatutDemande.APPROUVEE },
          data: { statut: StatutDemande.ANNULEE },
        });
        this.assertTransitionApplied(transition.count);
        await this.solde.restituerSolde(tx, conge.agentId, conge.type, conge.nombreJours);
        return tx.conge.findUniqueOrThrow({
          where: { id },
          include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
        });
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.conge.updateMany({
        where: { id, statut: conge.statut },
        data: { statut: StatutDemande.ANNULEE },
      });
      this.assertTransitionApplied(transition.count);
      return tx.conge.findUniqueOrThrow({
        where: { id },
        include: { agent: { select: { id: true, nomFr: true, prenomFr: true } } },
      });
    });
  }

  // ============================================================
  //  Soldes — délégués à CongesSoldeService
  // ============================================================

  async getSolde(agentId: number) {
    return this.solde.getSolde(agentId);
  }

  async assertCanAccessAgent(agentId: number, user: CongesUser): Promise<void> {
    if (GLOBAL_CONGE_ROLES.includes(user.role)) return;
    if ((N1_ROLES as readonly string[]).includes(user.role)) {
      const agent = await this.prisma.agent.findFirst({
        where: { id: agentId, deletedAt: null },
        select: { structureId: true },
      });
      if (!agent) throw new NotFoundException('Agent introuvable.');
      await this.assertStructureInN1Scope(user, agent.structureId);
      return;
    }
    this.requireAgentId(user);
    if (user.agentId !== agentId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à consulter ce solde.");
    }
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

  private async buildValidationWhere(
    user: CongesUser,
    statuts: StatutDemande[],
  ): Promise<Prisma.CongeWhereInput> {
    const where: Prisma.CongeWhereInput = { statut: { in: statuts } };
    if ((N1_ROLES as readonly string[]).includes(user.role)) {
      where.agent = {
        structureId: { in: await this.getN1StructureScope(user) },
        deletedAt: null,
      };
    }
    return where;
  }

  private async assertCanValidate(
    user: CongesUser,
    targetStructureId: number | null,
    niveau: 'N1' | 'N2',
  ): Promise<void> {
    const role = user.role as Role;
    if (niveau === 'N2') {
      if (!(N2_ROLES as readonly Role[]).includes(role)) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à valider cette étape.");
      }
      return;
    }

    if (!(N1_ROLES as readonly Role[]).includes(role)) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à valider cette étape.");
    }
    if (targetStructureId == null) {
      throw new ForbiddenException(
        "La demande n'est rattachée à aucune structure validable.",
      );
    }

    await this.assertStructureInN1Scope(user, targetStructureId);
  }

  private async assertStructureInN1Scope(
    user: CongesUser,
    targetStructureId: number | null,
  ): Promise<void> {
    if (targetStructureId == null) {
      throw new ForbiddenException(
        "La demande n'est rattachée à aucune structure validable.",
      );
    }
    const allowedStructureIds = await this.getN1StructureScope(user);
    if (!allowedStructureIds.includes(targetStructureId)) {
      throw new ForbiddenException(
        "Cette demande ne relève pas de votre périmètre organisationnel.",
      );
    }
  }

  private async getN1StructureScope(user: CongesUser): Promise<number[]> {
    this.requireAgentId(user);
    const validator = await this.prisma.agent.findFirst({
      where: { id: user.agentId, deletedAt: null },
      select: { structureId: true },
    });
    if (validator?.structureId == null) {
      throw new ForbiddenException(
        "Aucune structure n'est associée à votre compte. Accès refusé.",
      );
    }

    if (user.role === Role.CHEF_SERVICE) return [validator.structureId];

    const structures = await this.prisma.structure.findMany({
      select: { id: true, parentId: true },
    });
    const scope = new Set<number>([validator.structureId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const structure of structures) {
        if (
          structure.parentId != null &&
          scope.has(structure.parentId) &&
          !scope.has(structure.id)
        ) {
          scope.add(structure.id);
          changed = true;
        }
      }
    }
    return [...scope];
  }

  private assertTransitionApplied(count: number): void {
    if (count !== 1) {
      throw new ConflictException(
        "Cette demande a déjà été traitée par un autre utilisateur.",
      );
    }
  }

  /**
   * Lève une ForbiddenException si un utilisateur non-privilégié n'a pas d'agentId associé.
   * Sans cette vérification, Prisma ignorerait un agentId `undefined` et retournerait tous les enregistrements.
   */
  private requireAgentId(user: CongesUser): asserts user is CongesUser & { agentId: number } {
    if (user.agentId == null) {
      throw new ForbiddenException("Aucun agent associé à ce compte. Accès refusé.");
    }
  }

  private assertOwnConge(
    congeAgentId: number,
    user: CongesUser,
    action: 'soumettre' | 'annuler',
  ): void {
    this.requireAgentId(user);
    if (congeAgentId !== user.agentId) {
      throw new ForbiddenException(`Vous n'êtes pas autorisé à ${action} cette demande.`);
    }
  }

  private paginate<T>(data: T[], total: number, page: number, limit: number) {
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
