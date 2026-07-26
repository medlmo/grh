/**
 * CongesSoldeService — Gestion des soldes de congés annuels.
 * Extrait de CongesService pour respecter le principe de responsabilité unique.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypeConge, Prisma } from '@prisma/client';

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
export class CongesSoldeService {
  constructor(private prisma: PrismaService) {}

  async getSolde(agentId: number): Promise<SoldeCongeResult> {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent introuvable.');

    const anneeEnCours = new Date().getFullYear();
    let solde = await this.prisma.soldeConge.findUnique({ where: { agentId } });

    const ancienneteAnnees = this.calculerAnciennete(agent.dateRecrutement);
    const droits = this.calculerDroitsAnnuels(ancienneteAnnees);

    if (!solde || solde.exercice !== anneeEnCours) {
      // Nouvel exercice : report du reliquat plafonné à 22 jours
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

  /**
   * Décompte le solde dans une transaction Prisma (appelé lors de l'approbation).
   * Doit être appelé depuis un $transaction pour garantir l'atomicité.
   */
  async decompterSolde(
    tx: Prisma.TransactionClient,
    agentId: number,
    type: TypeConge,
    nombreJours: number,
  ): Promise<void> {
    const config = await tx.typeCongeConfig.findUnique({ where: { type } });
    if (!config?.avecSolde) return;
    await tx.soldeConge.update({
      where: { agentId },
      data: { prisExercice: { increment: nombreJours } },
    });
  }

  /**
   * Restitue le solde dans une transaction (appelé lors de l'annulation d'un congé approuvé).
   */
  async restituerSolde(
    tx: Prisma.TransactionClient,
    agentId: number,
    type: TypeConge,
    nombreJours: number,
  ): Promise<void> {
    const config = await tx.typeCongeConfig.findUnique({ where: { type } });
    if (!config?.avecSolde) return;
    await tx.soldeConge.update({
      where: { agentId },
      data: { prisExercice: { decrement: nombreJours } },
    });
  }

  /** Ancienneté en années complètes depuis la date de recrutement. */
  calculerAnciennete(dateRecrutement: Date): number {
    const ms = Date.now() - new Date(dateRecrutement).getTime();
    return Math.max(0, Math.floor(ms / (365.25 * 24 * 3600 * 1000)));
  }

  private calculerDroitsAnnuels(_annees: number): number {
    // Art. 40 du Dahir 1-58-008 : 22 jours ouvrables par année de service
    return 22;
  }
}
