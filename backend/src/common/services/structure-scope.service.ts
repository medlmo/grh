import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user';

const GLOBAL_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.DRH,
  Role.DIRECTEUR_GENERAL,
  Role.PRESIDENT,
];

const SCOPED_MANAGER_ROLES: readonly Role[] = [
  Role.CHEF_SERVICE,
  Role.CHEF_DIVISION,
];

@Injectable()
export class StructureScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgentWhere(user: AuthenticatedUser): Promise<Prisma.AgentWhereInput> {
    const base: Prisma.AgentWhereInput = { deletedAt: null };

    if (GLOBAL_ROLES.includes(user.role)) return base;

    if (user.role === Role.AGENT) {
      if (!user.agentId) {
        throw new ForbiddenException("Aucun dossier agent n'est associé à ce compte.");
      }
      return { ...base, id: user.agentId };
    }

    if (SCOPED_MANAGER_ROLES.includes(user.role)) {
      return {
        ...base,
        structureId: { in: await this.getManagedStructureIds(user) },
      };
    }

    throw new ForbiddenException("Vous n'êtes pas autorisé à accéder aux dossiers agents.");
  }

  async getManagedStructureIds(user: AuthenticatedUser): Promise<number[]> {
    if (!SCOPED_MANAGER_ROLES.includes(user.role) || !user.agentId) {
      throw new ForbiddenException("Aucun périmètre hiérarchique n'est associé à ce compte.");
    }

    const manager = await this.prisma.agent.findFirst({
      where: { id: user.agentId, deletedAt: null },
      select: { structureId: true },
    });
    if (!manager?.structureId) {
      throw new ForbiddenException("Aucune structure n'est associée à ce compte.");
    }

    if (user.role === Role.CHEF_SERVICE) return [manager.structureId];

    const structures = await this.prisma.structure.findMany({
      select: { id: true, parentId: true },
    });
    const scope = new Set<number>([manager.structureId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const structure of structures) {
        if (structure.parentId && scope.has(structure.parentId) && !scope.has(structure.id)) {
          scope.add(structure.id);
          changed = true;
        }
      }
    }
    return [...scope];
  }
}