export interface Conge {
  id: number;
  agentId: number;
  agent?: {
    id: number;
    matricule: string;
    prenomFr: string;
    nomFr: string;
    prenomAr?: string;
    nomAr?: string;
    structure?: { libelleFr: string };
  };
  type: string;
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  motif?: string;
  statut: string;
  justificatifUrl?: string;
  commentaire?: string;
  motifRefus?: string;
}

export interface TypeConfig {
  type: string;
  libelleFr: string;
  libelleAr?: string;
  dureeMaxJours?: number;
  avecSolde: boolean;
  justificatifRequis: boolean;
}

export interface Solde {
  agentId: number;
  droitsAnnuels: number;
  soldeReporte: number;
  prisExercice: number;
  exercice: number;
  restant: number;
  ancienneteAnnees: number;
}
