import { ForbiddenException } from '@nestjs/common';
import { Role, StatutDemande, TypeConge } from '@prisma/client';
import { CongesService } from '../src/conges/conges.service';

describe("CongesService — isolation des demandes", () => {
  const standardUser = { id: 10, agentId: 7, role: Role.AGENT };
  const otherUser    = { id: 11, agentId: 8, role: Role.AGENT };

  const makeService = () => {
    const prisma = {
      agent: { findUnique: jest.fn() },
      conge: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const metier = {
      stripTime: jest.fn((date: Date) => date),
      getTypeConfig: jest.fn().mockResolvedValue(null),
      calculerJoursOuvrables: jest.fn().mockResolvedValue(1),
      verifierReglesMetier: jest.fn().mockResolvedValue(undefined),
      verifierChevauchement: jest.fn().mockResolvedValue(undefined),
      guardStatut: jest.fn(),
    };
    const solde = {
      restituerSolde: jest.fn(),
      decompterSolde: jest.fn(),
      getSolde: jest.fn(),
      recalculerSolde: jest.fn(),
    };

    return {
      service: new CongesService(prisma as any, metier as any, solde as any),
      prisma,
    };
  };

  const draftDto = {
    type: TypeConge.ANNUEL,
    dateDebut: '2026-09-01',
    dateFin: '2026-09-01',
    agentId: standardUser.agentId,
  };

  // Creation ----------------------------------------------------------------

  it("deduit l'agent du JWT lors de la creation (agentId JWT utilise)", async () => {
    const { service, prisma } = makeService();
    prisma.agent.findUnique.mockResolvedValue({ id: standardUser.agentId, structure: null });
    prisma.conge.create.mockResolvedValue({ id: 1 });

    await service.create(draftDto, standardUser);

    expect(prisma.agent.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: standardUser.agentId } }),
    );
    expect(prisma.conge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentId: standardUser.agentId,
          demandeurId: standardUser.agentId,
        }),
      }),
    );
  });

  it("refuse la creation pour un compte sans agentId associe", async () => {
    const { service } = makeService();
    const userSansAgent = { id: 99, agentId: undefined as any, role: Role.AGENT };

    await expect(
      service.create({ ...draftDto, agentId: otherUser.agentId } as any, userSansAgent),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // Soumission --------------------------------------------------------------

  it("refuse la soumission d'un brouillon appartenant a un autre agent", async () => {
    const { service, prisma } = makeService();
    prisma.conge.findUnique.mockResolvedValue({
      id: 1,
      agentId: otherUser.agentId,
      statut: StatutDemande.BROUILLON,
    });

    await expect(service.soumettre(1, standardUser)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.conge.update).not.toHaveBeenCalled();
  });

  it.each([
    Role.CHEF_SERVICE,
    Role.CHEF_DIVISION,
    Role.DRH,
    Role.DIRECTEUR_GENERAL,
    Role.PRESIDENT,
    Role.ADMIN,
  ])("ne permet pas au role %s de soumettre la demande d'un autre agent", async (role) => {
    const { service, prisma } = makeService();
    prisma.conge.findUnique.mockResolvedValue({
      id: 1,
      agentId: otherUser.agentId,
      statut: StatutDemande.BROUILLON,
    });

    await expect(
      service.soumettre(1, { id: 20, agentId: standardUser.agentId, role }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.conge.update).not.toHaveBeenCalled();
  });

  // Annulation --------------------------------------------------------------

  it("refuse l'annulation d'une demande appartenant a un autre agent", async () => {
    const { service, prisma } = makeService();
    prisma.conge.findUnique.mockResolvedValue({
      id: 1,
      agentId: otherUser.agentId,
      statut: StatutDemande.BROUILLON,
    });

    await expect(service.annuler(1, standardUser.id, standardUser))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.conge.update).not.toHaveBeenCalled();
  });

  it.each([
    Role.CHEF_SERVICE,
    Role.CHEF_DIVISION,
    Role.DRH,
    Role.DIRECTEUR_GENERAL,
    Role.PRESIDENT,
    Role.ADMIN,
  ])("ne permet pas au role %s d'annuler la demande d'un autre agent", async (role) => {
    const { service, prisma } = makeService();
    prisma.conge.findUnique.mockResolvedValue({
      id: 1,
      agentId: otherUser.agentId,
      statut: StatutDemande.BROUILLON,
    });

    await expect(
      service.annuler(1, 20, { id: 20, agentId: standardUser.agentId, role }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.conge.update).not.toHaveBeenCalled();
  });
});
