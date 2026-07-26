import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Send, RotateCcw } from 'lucide-react';
import { TFunction } from 'i18next';
import { Conge, Solde } from '../../types/conges';
import { typeLabel, StatusBadge } from '../../utils/congesHelpers';

interface MesCongesTabProps {
  conges: Conge[];
  solde: Solde | null;
  isLoading: boolean;
  t: TFunction;
  onNewRequest: () => void;
  onAction: (id: number, action: string) => void;
}

const MesCongesTab: React.FC<MesCongesTabProps> = ({
  conges,
  solde,
  isLoading,
  t,
  onNewRequest,
  onAction,
}) => {
  const renderActions = (conge: Conge) => {
    const actions: React.JSX.Element[] = [];
    if (conge.statut === 'BROUILLON') {
      actions.push(
        <button
          key="submit"
          className="btn btn-sm btn-accent"
          onClick={() => onAction(conge.id, 'soumettre')}
          title={t('conges.submit')}
        >
          <Send size={14} /> {t('conges.submit')}
        </button>
      );
    }
    if (!['REFUSEE', 'ANNULEE'].includes(conge.statut)) {
      actions.push(
        <button
          key="cancel"
          className="btn btn-sm btn-outline"
          onClick={() => onAction(conge.id, 'annuler')}
          title={t('conges.cancel')}
        >
          <RotateCcw size={14} /> {t('conges.cancel')}
        </button>
      );
    }
    return <div className="flex flex-wrap gap-2">{actions}</div>;
  };

  return (
    <>
      {solde && (
        <div className="stats-grid mb-6">
          <div className="stat-card blue">
            <div className="stat-content">
              <div className="stat-value">{solde.restant} j</div>
              <div className="stat-label">
                {t('conges.remaining_days')} ({solde.exercice})
              </div>
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-content">
              <div className="stat-value">{solde.droitsAnnuels} j</div>
              <div className="stat-label">{t('conges.annual_rights')}</div>
            </div>
          </div>
          <div className="stat-card gold">
            <div className="stat-content">
              <div className="stat-value">{solde.soldeReporte} j</div>
              <div className="stat-label">{t('conges.carried_over')}</div>
            </div>
          </div>
          <div className="stat-card red">
            <div className="stat-content">
              <div className="stat-value">{solde.prisExercice} j</div>
              <div className="stat-label">{t('conges.taken_current_year')}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t('conges.my_leaves')}</h2>
          <button className="btn btn-primary" onClick={onNewRequest}>
            <Plus size={18} />
            {t('conges.new_request')}
          </button>
        </div>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
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
                  <td colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="spinner"></div>
                    </div>
                  </td>
                </tr>
              ) : conges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    {t('conges.no_leaves')}
                  </td>
                </tr>
              ) : (
                conges.map((conge) => (
                  <tr key={conge.id}>
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
    </>
  );
};

export default MesCongesTab;
