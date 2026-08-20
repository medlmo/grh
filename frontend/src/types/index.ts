// ── Structures organisationnelles ────────────────────────────────────────────

export interface Structure {
  id: number;
  code?: string;
  libelleFr: string;
  libelleAr?: string;
  parentId?: number | null;
}

// ── Grille RH (Corps → Cadre → Grade → Échelon) ──────────────────────────────

export interface Corps {
  id: number;
  code: string;
  libelleFr: string;
  libelleAr?: string;
}

export interface Cadre {
  id: number;
  code: string;
  libelleFr: string;
  libelleAr?: string;
  corpsId: number;
}

export interface Grade {
  id: number;
  code: string;
  libelleFr: string;
  libelleAr?: string;
  cadreId: number;
}

export interface Echelon {
  id: number;
  numero: number;
  dureeMinMois: number;
  gradeId: number;
  _count?: { agents: number };
}

// ── Agent ─────────────────────────────────────────────────────────────────────

/** Version allégée retournée par GET /agents (liste) */
export interface AgentSummary {
  id: number;
  matricule: string;
  cin?: string;
  nomFr: string;
  nomAr?: string;
  prenomFr: string;
  prenomAr?: string;
  sexe: 'M' | 'F';
  statut: string;
  statutCarriere: string;
  fonctionFr?: string | null;
  structureId?: number | null;
  corpsId?: number | null;
  cadreId?: number | null;
  gradeId?: number | null;
  structure?: { libelleFr: string } | null;
  grade?: { libelleFr: string } | null;
  createdAt?: string;
}

export interface CareerEvent {
  id: number;
  evenement: string;
  dateEffet: string;
  descriptionFr?: string | null;
  gradeAvantId?: number | null;
  gradeApresId?: number | null;
  echelonAvant?: number | null;
  echelonApres?: number | null;
}

export interface Diplome {
  id: number;
  intituleFr: string;
  intituleAr?: string | null;
  etablissement?: string | null;
  anneeObtention?: number | string | null;
}

export interface PieceJointe {
  id: number;
  type: string;
  nomFichier: string;
  mimeType: string;
  taille: number;
}

/** Version complète retournée par GET /agents/:id */
export interface AgentDetail extends AgentSummary {
  lieuNaissanceFr?: string | null;
  lieuNaissanceAr?: string | null;
  dateNaissance: string;
  nationalite: string;
  situationFamiliale: string;
  nbEnfants: number;
  adresseFr?: string | null;
  adresseAr?: string | null;
  email?: string | null;
  telephone?: string | null;
  dateRecrutement: string;
  dateTitularisation?: string | null;
  dateFinContrat?: string | null;
  caisseRetraite?: string | null;
  matriculeRetraite?: string | null;
  corps?: { libelleFr: string } | null;
  cadre?: { libelleFr: string } | null;
  echelon?: { numero: number; dureeMinMois?: number | null } | null;
  carriereHistorique?: CareerEvent[];
  diplomes?: Diplome[];
  piecesJointes?: PieceJointe[];
}

export interface Anciennete {
  annees: number;
  mois: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalAgents: number;
  absentsAujourdhui: number;
  congesEnAttente: number;
  decisionsNonSignees: number;
  parSexe: Array<{ sexe: string; count: number }>;
  parStatutCarriere: Array<{ statut: string; count: number }>;
  congesParType: Array<{ type: string; count: number; jours: number }>;
  evolutionMensuelle: Array<{ mois: string; total: number }>;
  parStructure: Array<{ count: number; [key: string]: unknown }>;
  pyramideAges: Array<{ tranche: string; hommes: number; femmes: number }>;
  retraitesProches: Array<{
    id: number;
    matricule: string;
    nom: string;
    grade: string;
    structure: string;
    age: number;
    anneeRetraite: number;
    dansAns: number;
  }>;
}

// ── Décisions ─────────────────────────────────────────────────────────────────

export interface Decision {
  id: number;
  numero: string;
  objetFr: string;
  type: string;
  dateEffet: string;
  dateSignature?: string | null;
  agent?: { prenomFr: string; nomFr: string } | null;
}

// ── Utilisateurs / Comptes ────────────────────────────────────────────────────

export type UserRole =
  | 'ADMIN'
  | 'DRH'
  | 'DIRECTEUR_GENERAL'
  | 'PRESIDENT'
  | 'CHEF_DIVISION'
  | 'CHEF_SERVICE'
  | 'AGENT';

export interface Utilisateur {
  id: number;
  email: string;
  role: UserRole;
  statut: string;
  agentId?: number | null;
  agent?: { prenomFr: string; nomFr: string } | null;
  derniereConn?: string | null;
}

// ── Paramétrage collectivité ──────────────────────────────────────────────────

export interface Collectivite {
  nomFr: string;
  nomAr: string;
  enteteFr: string;
  enteteAr: string;
  email: string;
  telephone: string;
  adresse: string;
}
