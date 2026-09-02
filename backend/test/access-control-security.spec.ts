import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Role, StatutCompte } from '@prisma/client';
import { createHash } from 'crypto';
import { StructureScopeService } from '../src/common/services/structure-scope.service';
import { AgentsService } from '../src/agents/agents.service';
import { DecisionsService } from '../src/decisions/decisions.service';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { UtilisateursService } from '../src/utilisateurs/utilisateurs.service';
import { AuthService } from '../src/auth/auth.service';

describe('Protections transversales des accès', () => {
  it('limite un Chef Service à sa structure et un Chef Division à ses descendants', async () => {
    const prisma = {
      agent: { findFirst: jest.fn().mockResolvedValue({ structureId: 10 }) },
      structure: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, parentId: null },
          { id: 11, parentId: 10 },
          { id: 12, parentId: 11 },
          { id: 20, parentId: null },
        ]),
      },
    };
    const service = new StructureScopeService(prisma as any);

    await expect(service.getManagedStructureIds({
      id: 1,
      agentId: 5,
      role: Role.CHEF_SERVICE,
    })).resolves.toEqual([10]);

    await expect(service.getManagedStructureIds({
      id: 2,
      agentId: 6,
      role: Role.CHEF_DIVISION,
    })).resolves.toEqual(expect.arrayContaining([10, 11, 12]));
  });

  it("applique le périmètre au détail agent et n'expose pas le chemin de stockage", async () => {
    const prisma = {
      agent: {
        findFirst: jest.fn().mockResolvedValue({
          id: 9,
          piecesJointes: [{
            id: 3,
            agentId: 9,
            nomFichier: 'piece.pdf',
            chemin: '/stockage/interne/piece.pdf',
          }],
        }),
      },
    };
    const scopeWhere = { deletedAt: null, structureId: { in: [10] } };
    const structureScope = { getAgentWhere: jest.fn().mockResolvedValue(scopeWhere) };
    const service = new AgentsService(prisma as any, structureScope as any);

    const result = await service.findOne(9, {
      id: 1,
      agentId: 5,
      role: Role.CHEF_SERVICE,
    });

    expect(prisma.agent.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ id: 9 }, scopeWhere] },
    }));
    expect(result.piecesJointes[0]).not.toHaveProperty('chemin');
  });

  it('applique le périmètre aux listes et détails des décisions', async () => {
    const scopeWhere = { deletedAt: null, structureId: { in: [10, 11] } };
    const prisma = {
      decisionAdmin: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({ id: 4 }),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    const structureScope = { getAgentWhere: jest.fn().mockResolvedValue(scopeWhere) };
    const service = new DecisionsService(prisma as any, structureScope as any);
    const user = { id: 1, agentId: 5, role: Role.CHEF_DIVISION };

    await service.findAll({ page: 1, limit: 20 }, user);
    await service.findOne(4, user);

    expect(prisma.decisionAdmin.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { agent: scopeWhere },
    }));
    expect(prisma.decisionAdmin.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 4, agent: scopeWhere },
    }));
  });

  it('applique le périmètre aux statistiques du dashboard', async () => {
    const scopeWhere = { deletedAt: null, structureId: { in: [10] } };
    const prisma = {
      agent: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      conge: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      decisionAdmin: { count: jest.fn().mockResolvedValue(0) },
      structure: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const structureScope = { getAgentWhere: jest.fn().mockResolvedValue(scopeWhere) };
    const service = new DashboardService(prisma as any, structureScope as any);

    await service.getStats({ id: 1, agentId: 5, role: Role.CHEF_SERVICE });

    expect(prisma.agent.count).toHaveBeenCalledWith({ where: scopeWhere });
    expect(prisma.conge.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ agent: scopeWhere }),
    });
    expect(prisma.decisionAdmin.count).toHaveBeenCalledWith({
      where: { dateSignature: null, agent: scopeWhere },
    });
  });

  it("interdit à un administrateur de changer son rôle ou de modifier un autre administrateur", async () => {
    const prisma = {
      utilisateur: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new UtilisateursService(prisma as any);

    prisma.utilisateur.findUnique.mockResolvedValueOnce({
      id: 1,
      email: 'admin@example.com',
      role: Role.ADMIN,
      statut: StatutCompte.ACTIF,
    });
    await expect(service.update(1, { role: Role.DRH }, 1))
      .rejects.toBeInstanceOf(ForbiddenException);

    prisma.utilisateur.findUnique.mockResolvedValueOnce({
      id: 2,
      email: 'admin2@example.com',
      role: Role.ADMIN,
      statut: StatutCompte.ACTIF,
    });
    await expect(service.update(2, { email: 'changed@example.com' }, 1))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.utilisateur.update).not.toHaveBeenCalled();
  });

  it('refuse le refresh après suspension et invalide le refresh token stocké', async () => {
    const token = 'refresh-token';
    const prisma = {
      utilisateur: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          email: 'suspendu@example.com',
          role: Role.AGENT,
          statut: StatutCompte.SUSPENDU,
          agentId: 8,
          agent: { deletedAt: null },
          refreshToken: createHash('sha256').update(token).digest('hex'),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 7 }) };
    const config = { get: jest.fn() };
    const service = new AuthService(prisma as any, jwt as any, config as any);

    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.utilisateur.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { refreshToken: null },
    });
  });
});