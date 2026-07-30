import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import styles from './Conges.module.css';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { XCircle, AlertCircle, Bell } from 'lucide-react';
import { Conge, TypeConfig, Solde } from '../types/conges';

import MesCongesTab from '../components/conges/MesCongesTab';
import ValidationTab from '../components/conges/ValidationTab';
import CalendrierTab from '../components/conges/CalendrierTab';
import CongeFormModal from '../components/conges/CongeFormModal';
import RefuseModal from '../components/conges/RefuseModal';

const Conges: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { pendingCount, refreshPendingCount } = useNotifications();
  const isRtl = i18n.language === 'ar';

  const [conges, setConges] = useState<Conge[]>([]);
  const [types, setTypes] = useState<TypeConfig[]>([]);
  const [solde, setSolde] = useState<Solde | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mes-conges' | 'validation' | 'calendrier'>('mes-conges');
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal nouvelle demande
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    type: '',
    dateDebut: '',
    dateFin: '',
    motif: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Modal refus
  const [refuseModal, setRefuseModal] = useState<{ open: boolean; congeId?: number; motif: string }>({
    open: false,
    motif: '',
  });

  // Calendrier
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const isValidator = useMemo(() => {
    return ['CHEF_SERVICE', 'CHEF_DIVISION', 'DRH', 'DIRECTEUR_GENERAL', 'PRESIDENT'].includes(
      user?.role || '',
    );
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    setAlert(null);
    try {
      if (activeTab === 'mes-conges') {
        const [congesRes, soldeRes, typesRes] = await Promise.all([
          api.get('/conges', { params: { mine: 'true' } }),
          user?.agentId ? api.get(`/conges/solde/${user.agentId}`) : Promise.resolve({ data: null }),
          api.get('/conges/types'),
        ]);
        setConges(congesRes.data);
        setSolde(soldeRes.data);
        setTypes(typesRes.data);
      } else if (activeTab === 'validation') {
        const [response, typesRes] = await Promise.all([
          api.get('/conges/a-valider'),
          api.get('/conges/types'),
        ]);
        setConges(response.data);
        setTypes(typesRes.data);
      } else {
        // Pour éviter d'importer date-fns ici juste pour formater, on peut extraire le début et fin
        // Mais c'est plus simple de garder le formatage ici ou de le passer à l'API.
        const debut = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-01`;
        // Fin de mois approximative (l'API gérera)
        const dateFinMois = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
        const fin = `${dateFinMois.getFullYear()}-${String(dateFinMois.getMonth() + 1).padStart(2, '0')}-${String(dateFinMois.getDate()).padStart(2, '0')}`;

        const [response, typesRes] = await Promise.all([
          api.get('/conges/calendrier', { params: { debut, fin } }),
          api.get('/conges/types'),
        ]);
        setConges(response.data);
        setTypes(typesRes.data);
      }
    } catch (error: any) {
      setAlert({ message: t('conges.error_loading'), type: 'error' });
      console.error('Error fetching conges data:', error);
    } finally {
      setIsLoading(false);
    }
    refreshPendingCount();
  };

  useEffect(() => {
    fetchData();
    if (isValidator) refreshPendingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, calendarMonth]);

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = async (submit = false) => {
    if (!form.type || !form.dateDebut || !form.dateFin) {
      setFormError('Veuillez renseigner le type, la date de début et la date de retour.');
      return;
    }
    setFormError(null);
    setFormSubmitting(true);
    try {
      const payload: any = {
        type: form.type,
        dateDebut: form.dateDebut,
        dateFin: form.dateFin,
        agentId: Number(user?.agentId),
      };
      if (form.motif) payload.motif = form.motif;
      const created = await api.post('/conges', payload);
      if (submit) {
        await api.post(`/conges/${created.data.id}/soumettre`);
        showAlert(t('conges.success_submitted'));
      } else {
        showAlert(t('conges.success_created'));
      }
      setIsModalOpen(false);
      setForm({ type: '', dateDebut: '', dateFin: '', motif: '' });
      fetchData();
    } catch (error: any) {
      setFormError(error.response?.data?.message || t('common.error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAction = async (id: number, action: string, payload?: any) => {
    try {
      await api.post(`/conges/${id}/${action}`, payload || {});
      const messages: Record<string, string> = {
        soumettre: t('conges.success_submitted'),
        'valider-n1': t('conges.success_validated'),
        'valider-n2': t('conges.success_validated'),
        'valider-drh': t('conges.success_validated'),
        refuser: t('conges.success_refused'),
        annuler: t('conges.success_cancelled'),
      };
      showAlert(messages[action] || t('common.success'));
      fetchData();
      refreshPendingCount();
    } catch (error: any) {
      showAlert(error.response?.data?.message || t('common.error'), 'error');
    }
  };

  const openRefuse = (id: number) => setRefuseModal({ open: true, congeId: id, motif: '' });

  const handleRefuseConfirm = async () => {
    if (!refuseModal.congeId || !refuseModal.motif.trim()) return;
    await handleAction(refuseModal.congeId, 'refuser', { motifRefus: refuseModal.motif });
    setRefuseModal({ open: false, motif: '' });
  };

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1>{t('conges.title')}</h1>
      </div>

      {alert && (
        <div className={`toast mb-4 ${alert.type}`}>
          <AlertCircle size={18} />
          <span className="toast-message">{alert.message}</span>
          <button className="btn-icon toast-close" onClick={() => setAlert(null)}>
            <XCircle size={16} />
          </button>
        </div>
      )}

      {isValidator && pendingCount > 0 && activeTab !== 'validation' && (
        <div className="card mb-6 bg-warning/10 border-warning/30">
          <div className="card-body flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning rounded-full text-white">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-warning-700">
                  {t('conges.pending_notifications', { count: pendingCount })}
                </h3>
                <p className="text-sm text-warning-600">
                  {t('conges.pending_notifications_desc')}
                </p>
              </div>
            </div>
            <button
              className="btn btn-accent whitespace-nowrap"
              onClick={() => setActiveTab('validation')}
            >
              {t('conges.see_validation')}
            </button>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <div className="tabs mb-0">
          <button
            className={`tab flex-1 text-center ${activeTab === 'mes-conges' ? 'active' : ''}`}
            onClick={() => setActiveTab('mes-conges')}
          >
            {t('conges.my_leaves')}
          </button>
          {isValidator && (
            <button
              className={`tab flex-1 text-center ${activeTab === 'validation' ? 'active' : ''}`}
              onClick={() => setActiveTab('validation')}
              style={{ position: 'relative' }}
            >
              {t('conges.validation')}
              {pendingCount > 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginInlineStart: '8px',
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 6px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: '#fff',
                  background: '#ef4444',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                  animation: 'pulse 2s infinite',
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          )}
          <button
            className={`tab flex-1 text-center ${activeTab === 'calendrier' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendrier')}
          >
            {t('conges.calendar')}
          </button>
        </div>
      </div>

      {activeTab === 'mes-conges' && (
        <MesCongesTab
          conges={conges}
          solde={solde}
          isLoading={isLoading}
          t={t}
          onNewRequest={() => setIsModalOpen(true)}
          onAction={handleAction}
        />
      )}
      {activeTab === 'validation' && (
        <ValidationTab
          conges={conges}
          isLoading={isLoading}
          t={t}
          userRole={user?.role || ''}
          onAction={handleAction}
          onRefuse={openRefuse}
        />
      )}
      {activeTab === 'calendrier' && (
        <CalendrierTab
          conges={conges}
          isLoading={isLoading}
          t={t}
          isRtl={isRtl}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
        />
      )}

      <CongeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        types={types}
        formError={formError}
        formSubmitting={formSubmitting}
        t={t}
        form={form}
        setForm={setForm}
        onSubmit={handleCreate}
      />

      <RefuseModal
        isOpen={refuseModal.open}
        onClose={() => setRefuseModal({ open: false, motif: '' })}
        motif={refuseModal.motif}
        setMotif={(motif) => setRefuseModal({ ...refuseModal, motif })}
        onConfirm={handleRefuseConfirm}
        t={t}
      />
    </div>
  );
};

export default Conges;
