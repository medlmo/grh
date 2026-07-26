import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { TFunction } from 'i18next';

export const TYPE_ORDER = [
  'ANNUEL',
  'MALADIE_COURTE',
  'MALADIE_MOYENNE',
  'MALADIE_LONGUE',
  'MATERNITE',
  'PATERNITE',
  'SANS_SOLDE',
  'AUTORISATION_ABSENCE',
  'EXCEPTIONNEL',
];

export const typeLabel = (type: string, t: TFunction) => {
  const key = `conges.types.${type}`;
  const translated = t(key);
  return translated !== key ? translated : type.replace(/_/g, ' ');
};

export const statusLabel = (statut: string, t: TFunction) => {
  const key = `conges.status.${statut}`;
  const translated = t(key);
  return translated !== key ? translated : statut.replace(/_/g, ' ');
};

export const StatusBadge: React.FC<{ statut: string; t: TFunction }> = ({ statut, t }) => {
  switch (statut) {
    case 'APPROUVEE':
      return (
        <span className="badge badge-success">
          <CheckCircle size={14} /> {statusLabel(statut, t)}
        </span>
      );
    case 'REFUSEE':
      return (
        <span className="badge badge-danger">
          <XCircle size={14} /> {statusLabel(statut, t)}
        </span>
      );
    case 'ANNULEE':
      return <span className="badge badge-gray">{statusLabel(statut, t)}</span>;
    case 'BROUILLON':
      return <span className="badge badge-gray">{statusLabel(statut, t)}</span>;
    default:
      return (
        <span className="badge badge-warning">
          <Clock size={14} /> {statusLabel(statut, t)}
        </span>
      );
  }
};
