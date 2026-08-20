import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { Decision } from '../types';
import styles from './Decisions.module.css';
import { Plus, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Decisions: React.FC = () => {
  const { t } = useTranslation();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        const response = await api.get('/decisions', { params: { limit: 100 } });
        setDecisions(response.data.data);
      } catch (error) {
        console.error('Error fetching decisions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDecisions();
  }, []);

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>{t('nav.decisions')}</h1>
        <button className="btn btn-primary">
          <Plus size={18} />
          Nouvelle Décision
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-bar w-full mb-0">
            <div className="search-input">
              <Search />
              <input type="text" placeholder={t('common.search')} />
            </div>
          </div>
        </div>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Objet</th>
                <th>Agent</th>
                <th>Type</th>
                <th>Date d'effet</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="flex justify-center"><div className="spinner"></div></div>
                  </td>
                </tr>
              ) : decisions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    Aucune décision trouvée.
                  </td>
                </tr>
              ) : (
                decisions.map((decision) => (
                  <tr key={decision.id}>
                    <td className="font-medium text-primary-600">{decision.numero}</td>
                    <td>{decision.objetFr}</td>
                    <td>{decision.agent?.prenomFr} {decision.agent?.nomFr}</td>
                    <td>{decision.type}</td>
                    <td>{format(new Date(decision.dateEffet), 'dd MMM yyyy', { locale: fr })}</td>
                    <td>
                      {decision.dateSignature ? (
                        <span className="badge badge-success">Signée</span>
                      ) : (
                        <span className="badge badge-warning">En attente de signature</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Decisions;
