import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, XCircle } from 'lucide-react';
import { TFunction } from 'i18next';
import { Conge } from '../../types/conges';
import { typeLabel, StatusBadge } from '../../utils/congesHelpers';

interface ValidationTabProps {
  conges: Conge[];
  isLoading: boolean;
  t: TFunction;
  userRole: string;
  onAction: (id: number, action: string) => void;
  onRefuse: (id: number) => void;
}

const ValidationTab: React.FC<ValidationTabProps> = ({
  conges,
  isLoading,
  t,
  userRole,
  onAction,
  onRefuse,
}) => {
  const renderActions = (conge: Conge) => {
    const actions: React.JSX.Element[] = [];
    if (conge.statut === 'EN_ATTENTE_N1' && ['CHEF_SERVICE', 'CHEF_DIVISION', 'DIRECTEUR_GENERAL', 'DRH', 'PRESIDENT'].includes(userRole)) {
      actions.push(
        <button
          key="n1"
          className="btn btn-sm btn-accent"
          onClick={() => onAction(conge.id, 'valider-n1')}
        >
          <CheckCircle size={14} /> {t('conges.validate')}
        </button>
      );
    }
    if (conge.statut === 'EN_ATTENTE_N2' && ['DIRECTEUR_GENERAL', 'DRH', 'PRESIDENT'].includes(userRole)) {
      actions.push(
        <button
          key="n2"
          className="btn btn-sm btn-accent"
          onClick={() => onAction(conge.id, 'valider-n2')}
        >
          <CheckCircle size={14} /> {t('conges.validate')}
        </button>
      );
    }
    if (conge.statut === 'EN_ATTENTE_DRH' && ['DRH', 'DIRECTEUR_GENERAL', 'PRESIDENT'].includes(userRole)) {
      actions.push(
        <button
          key="drh"
          className="btn btn-sm btn-accent"
          onClick={() => onAction(conge.id, 'valider-drh')}
        >
          <CheckCircle size={14} /> {t('conges.validate')}
        </button>
      );
    }
    if (['EN_ATTENTE_N1', 'EN_ATTENTE_N2', 'EN_ATTENTE_DRH'].includes(conge.statut)) {
      actions.push(
        <button
          key="refuse"
          className="btn btn-sm btn-danger"
          onClick={() => onRefuse(conge.id)}
        >
          <XCircle size={14} /> {t('conges.reject')}
        </button>
      );
    }
    return <div className="flex flex-wrap gap-2">{actions}</div>;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{t('conges.validation')}</h2>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('agents.name')}</th>
              <th>{t('agents.structure')}</th>
              <th>{t('conges.type')}</th>
              <th>{t('conges.start_date')}</th>
              <th>{t('conges.end_date')}</th>
              <th>{t('conges.duration')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="spinner"></div>
                  </div>
                </td>
              </tr>
            ) : conges.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-8">
                  {t('conges.no_leaves')}
                </td>
              </tr>
            ) : (
              conges.map((conge) => (
                <tr key={conge.id}>
                  <td className="font-medium">
                    {conge.agent?.prenomFr} {conge.agent?.nomFr}
                  </td>
                  <td>{conge.agent?.structure?.libelleFr}</td>
                  <td>{typeLabel(conge.type, t)}</td>
                  <td>{format(new Date(conge.dateDebut), 'dd MMM yyyy', { locale: fr })}</td>
                  <td>{format(new Date(conge.dateFin), 'dd MMM yyyy', { locale: fr })}</td>
                  <td>{conge.nombreJours} j</td>
                  <td><StatusBadge statut={conge.statut} t={t} /></td>
                  <td>{renderActions(conge)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ValidationTab;
