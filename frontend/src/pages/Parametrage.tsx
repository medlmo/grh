import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { Building2, Layers, Briefcase, Calendar } from 'lucide-react';
import FeriesTab from '../components/parametrage/FeriesTab';

const Parametrage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('collectivite');
  const [collectivite, setCollectivite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCollectivite = async () => {
      try {
        const response = await api.get('/parametrage/collectivite');
        setCollectivite(response.data);
      } catch (error) {
        console.error('Error fetching collectivite:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCollectivite();
  }, []);

  return (
    <div className="parametrage-page">
      <div className="page-header">
        <h1>{t('nav.parametrage')}</h1>
      </div>

      <div className="settings-grid">
        <div className="settings-nav">
          <button 
            className={`settings-nav-item ${activeTab === 'collectivite' ? 'active' : ''}`}
            onClick={() => setActiveTab('collectivite')}
          >
            <Building2 />
            Collectivité
          </button>
          <button 
            className={`settings-nav-item ${activeTab === 'structures' ? 'active' : ''}`}
            onClick={() => setActiveTab('structures')}
          >
            <Layers />
            Organigramme
          </button>
          <button 
            className={`settings-nav-item ${activeTab === 'grades' ? 'active' : ''}`}
            onClick={() => setActiveTab('grades')}
          >
            <Briefcase />
            Grades & Échelons
          </button>
          <button 
            className={`settings-nav-item ${activeTab === 'feries' ? 'active' : ''}`}
            onClick={() => setActiveTab('feries')}
          >
            <Calendar />
            Jours Fériés
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {activeTab === 'collectivite' && 'Informations de la Collectivité'}
              {activeTab === 'structures' && 'Organigramme'}
              {activeTab === 'grades' && 'Grades & Échelons'}
              {activeTab === 'feries' && 'Jours Fériés'}
            </h3>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="flex justify-center py-12"><div className="spinner"></div></div>
            ) : activeTab === 'collectivite' && collectivite ? (
              <form className="flex flex-col gap-6">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom (FR)</label>
                    <input type="text" className="form-input" defaultValue={collectivite.nomFr} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" dir="rtl">الاسم</label>
                    <input type="text" className="form-input text-right" defaultValue={collectivite.nomAr} dir="rtl" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">En-tête officiel (FR)</label>
                    <input type="text" className="form-input" defaultValue={collectivite.enteteFr} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" dir="rtl">الترويسة الرسمية</label>
                    <input type="text" className="form-input text-right" defaultValue={collectivite.enteteAr} dir="rtl" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email de contact</label>
                    <input type="email" className="form-input" defaultValue={collectivite.email} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input type="text" className="form-input" defaultValue={collectivite.telephone} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Adresse</label>
                  <textarea className="form-textarea" defaultValue={collectivite.adresse}></textarea>
                </div>

                <div className="flex justify-end mt-4">
                  <button type="button" className="btn btn-primary">{t('common.save')}</button>
                </div>
              </form>
            ) : activeTab === 'feries' ? (
              <FeriesTab />
            ) : (
              <div className="empty-state">
                <p>Module spécifique en cours de développement.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Parametrage;
