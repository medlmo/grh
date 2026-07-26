import { TFunction } from 'i18next';

export const STATUT_STYLES: Record<string, { badge: string; dot: string; bar: string }> = {
  TITULAIRE: { badge: 'badge-success', dot: 'bg-success', bar: 'bg-success' },
  STAGIAIRE: { badge: 'badge-info', dot: 'bg-info', bar: 'bg-info' },
  CONTRACTUEL: { badge: 'badge-warning', dot: 'bg-warning', bar: 'bg-warning' },
  JOURNALIER: { badge: 'badge-gray', dot: 'bg-gray-400', bar: 'bg-gray-400' },
};

export const CARRIERE_STYLES: Record<string, string> = {
  EN_ACTIVITE: 'badge-success',
  DETACHEMENT: 'badge-info',
  DISPONIBILITE: 'badge-warning',
  MIS_A_DISPOSITION: 'badge-gray',
  REINTEGRATION: 'badge-primary',
  RETRAITE: 'badge-gray',
  DEMISSION: 'badge-danger',
};

export const getInitials = (prenom: string, nom: string) => {
  return `${(prenom || '').charAt(0)}${(nom || '').charAt(0)}`.toUpperCase() || '?';
};

export const getAvatarGradient = (sexe: string) => {
  return sexe === 'F'
    ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
    : 'linear-gradient(135deg, var(--primary-500) 0%, var(--accent-600) 100%)';
};

export const statutLabel = (statut: string, t: TFunction) => {
  const labels: Record<string, string> = {
    TITULAIRE: t('agents.titulaires'),
    STAGIAIRE: t('agents.stagiaires'),
    CONTRACTUEL: t('agents.contractuels'),
    JOURNALIER: t('agents.contractuels'),
  };
  return labels[statut] || statut;
};

export const carriereLabel = (carriere: string, t: TFunction) => {
  const labels: Record<string, string> = {
    EN_ACTIVITE: t('agents.en_activite'),
    DETACHEMENT: t('agents.detachment'),
    DISPONIBILITE: t('agents.availability'),
    MIS_A_DISPOSITION: t('agents.availability'),
    REINTEGRATION: t('agents.active'),
    RETRAITE: t('agents.retired'),
    DEMISSION: t('agents.retired'),
  };
  return labels[carriere] || carriere;
};

export const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const calculateAge = (dateNaissance: string | null | undefined) => {
  if (!dateNaissance) return '-';
  const birth = new Date(dateNaissance);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} ans`;
};