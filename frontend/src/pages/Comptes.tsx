import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Routes, Route, Link } from 'react-router-dom';
import CompteForm from '../components/comptes/CompteForm';
import ConfirmModal from '../components/ui/ConfirmModal';

const ComptesList: React.FC = () => {
  const { t } = useTranslation();
  const [comptes, setComptes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; compteId: number | null }>({
    isOpen: false,
    compteId: null,
  });

  const fetchComptes = async () => {
    try {
      const response = await api.get('/utilisateurs');
      setComptes(response.data);
    } catch (error) {
      console.error('Error fetching comptes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComptes();
  }, []);

  const handleDelete = async () => {
    const id = deleteModal.compteId;
    if (!id) return;
    try {
      await api.delete(`/utilisateurs/${id}`);
      setDeleteModal({ isOpen: false, compteId: null });
      fetchComptes();
    } catch (error) {
      console.error('Error deleting compte:', error);
      setDeleteModal({ isOpen: false, compteId: null });
    }
  };

  return (
    <div className="comptes-page">
      <div className="page-header">
        <h1>Comptes & Accès</h1>
        <div className="page-actions">
          <Link to="/comptes/nouveau" className="btn btn-primary">
            <Plus size={18} />
            Nouveau compte
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Agent lié</th>
                <th>Dernière connexion</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="flex justify-center"><div className="spinner"></div></div>
                  </td>
                </tr>
              ) : comptes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    Aucun compte trouvé.
                  </td>
                </tr>
              ) : (
                comptes.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.email}</td>
                    <td>
                      <span className="badge badge-info">{c.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        c.statut === 'ACTIF' ? 'badge-success' : 
                        c.statut === 'SUSPENDU' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {c.statut}
                      </span>
                    </td>
                    <td>{c.agent ? `${c.agent.prenomFr} ${c.agent.nomFr}` : '-'}</td>
                    <td>{c.derniereConn ? new Date(c.derniereConn).toLocaleString() : 'Jamais'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/comptes/${c.id}/edit`} className="btn-icon text-gray-500 hover:text-info hover:bg-blue-50">
                          <Edit size={18} />
                        </Link>
                        <button 
                          onClick={() => setDeleteModal({ isOpen: true, compteId: c.id })}
                          className="btn-icon text-gray-500 hover:text-danger hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, compteId: null })}
        onConfirm={handleDelete}
        title={t('common.confirm')}
        message="Êtes-vous sûr de vouloir supprimer ce compte utilisateur ? Cette action est irréversible."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
      />
    </div>
  );
};

const Comptes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ComptesList />} />
      <Route path="/nouveau" element={<CompteForm />} />
      <Route path="/:id/edit" element={<CompteForm />} />
    </Routes>
  );
};

export default Comptes;