import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Mail, ShieldAlert, KeyRound } from 'lucide-react';
import api from '../../api/client';

const CompteForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    email: '',
    motDePasse: '',
    role: 'AGENT',
    statut: 'ACTIF',
    agentId: ''
  });
  const [agents, setAgents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch agents for the dropdown
    api.get('/agents').then(res => setAgents(res.data)).catch(console.error);

    if (isEdit) {
      api.get(`/utilisateurs/${id}`)
        .then(res => {
          setFormData({
            email: res.data.email,
            motDePasse: '', // Don't fill password
            role: res.data.role,
            statut: res.data.statut,
            agentId: res.data.agentId ? String(res.data.agentId) : ''
          });
        })
        .catch(err => {
          console.error(err);
          setError('Erreur lors du chargement du compte');
        });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const payload: any = {
      email: formData.email,
      role: formData.role,
      statut: formData.statut,
    };
    if (formData.agentId) {
      payload.agentId = parseInt(formData.agentId);
    }
    if (formData.motDePasse) {
      payload.motDePasse = formData.motDePasse;
    }

    try {
      if (isEdit) {
        await api.put(`/utilisateurs/${id}`, payload);
      } else {
        if (!payload.motDePasse) {
          setError('Le mot de passe est obligatoire pour un nouveau compte.');
          setIsSubmitting(false);
          return;
        }
        await api.post('/utilisateurs', payload);
      }
      navigate('/comptes');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="compte-form-page">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link to="/comptes" className="btn-icon text-gray-500 hover:text-gray-900 bg-white shadow-sm border border-gray-200">
            <ArrowLeft size={20} />
          </Link>
          <h1>{isEdit ? 'Modifier le compte' : 'Nouveau compte'}</h1>
        </div>
      </div>

      <div className="glass-card max-w-3xl mx-auto mt-6 p-8">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100 shadow-sm">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          
          <div className="form-section">
            <h3 className="form-section-title">
              <Mail size={20} />
              Informations de connexion
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group form-floating">
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <label>Email</label>
              </div>

              <div className="form-group form-floating">
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Mot de passe"
                  required={!isEdit}
                  minLength={6}
                  value={formData.motDePasse}
                  onChange={(e) => setFormData({...formData, motDePasse: e.target.value})}
                />
                <label>Mot de passe {isEdit && '(laisser vide pour ne pas modifier)'}</label>
              </div>
            </div>
          </div>

          <div className="form-section mt-6">
            <h3 className="form-section-title">
              <ShieldAlert size={20} />
              Droits et Accès
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group form-floating">
                <select 
                  className="form-control"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="AGENT">Agent</option>
                  <option value="CHEF_SERVICE">Chef de Service</option>
                  <option value="CHEF_DIVISION">Chef de Division</option>
                  <option value="DRH">DRH</option>
                  <option value="DIRECTEUR_GENERAL">Directeur Général</option>
                  <option value="PRESIDENT">Président</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
                <label>Rôle</label>
              </div>

              <div className="form-group form-floating">
                <select 
                  className="form-control"
                  value={formData.statut}
                  onChange={(e) => setFormData({...formData, statut: e.target.value})}
                >
                  <option value="ACTIF">Actif</option>
                  <option value="SUSPENDU">Suspendu</option>
                  <option value="BLOQUE">Bloqué</option>
                </select>
                <label>Statut du compte</label>
              </div>
              
              <div className="form-group form-floating md:col-span-2">
                <select 
                  className="form-control"
                  value={formData.agentId}
                  onChange={(e) => setFormData({...formData, agentId: e.target.value})}
                >
                  <option value="">-- Aucun agent lié --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.matricule} - {a.prenomFr} {a.nomFr}</option>
                  ))}
                </select>
                <label>Lier à un Agent (Optionnel)</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200/60 mt-8">
            <Link to="/comptes" className="btn btn-outline px-6">Annuler</Link>
            <button type="submit" className="btn btn-primary px-8" disabled={isSubmitting}>
              <Save size={18} />
              {isSubmitting ? 'Traitement...' : 'Enregistrer le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompteForm;
