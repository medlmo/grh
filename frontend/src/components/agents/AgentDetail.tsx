import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './AgentDetail.module.css';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  User,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Users as UsersIcon,
  GraduationCap,
  FileText,
  Clock,
  Building2,
  Award,
  BriefcaseBusiness,
  CalendarClock,
  IdCard,
  Baby,
  Heart,
  Globe,
  Pencil,
  Download,
} from 'lucide-react';
import api from '../../api/client';
import {
  STATUT_STYLES,
  CARRIERE_STYLES,
  getInitials,
  getAvatarGradient,
  formatDate,
  calculateAge,
} from '../../utils/agentHelpers';

type TabKey = 'overview' | 'career' | 'diplomas' | 'documents' | 'contact';

const AgentDetail: React.FC = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [agent, setAgent] = useState<any>(null);
  const [anciennete, setAnciennete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    Promise.all([
      api.get(`/agents/${id}`),
      api.get(`/agents/${id}/anciennete`).catch(() => null),
    ])
      .then(([agentRes, ancRes]) => {
        setAgent(agentRes.data);
        if (ancRes) setAnciennete(ancRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="empty-state">
        <User />
        <h3>Agent introuvable</h3>
        <p>Cet agent n'existe pas ou a été supprimé.</p>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: t('agents.admin_info'), icon: <Briefcase size={16} /> },
    { key: 'career', label: t('agents.career'), icon: <Clock size={16} />, count: agent.carriereHistorique?.length },
    { key: 'diplomas', label: t('agents.diplomas'), icon: <GraduationCap size={16} />, count: agent.diplomes?.length },
    { key: 'documents', label: t('agents.documents'), icon: <FileText size={16} />, count: agent.piecesJointes?.length },
    { key: 'contact', label: t('agents.contact_info'), icon: <Mail size={16} /> },
  ];

  const hasContact = agent.email || agent.telephone || agent.adresseFr;

  return (
    <div className="agent-detail-page">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link to="/agents" className="btn-icon text-gray-500 hover:text-gray-900 bg-white shadow-sm border border-gray-200">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>{t('agents.administrative_file')}</h1>
            <p className="page-subtitle">{agent.prenomFr} {agent.nomFr} — {agent.matricule}</p>
          </div>
        </div>
        <Link to={`/agents/${id}/edit`} className="btn btn-primary">
          <Pencil size={16} />
          {t('common.edit')}
        </Link>
      </div>

      <div className={`detail-grid ${styles['detail-grid-enhanced']}`}>
        {/* Sidebar */}
        <div className="detail-sidebar">
          <div className={`card ${styles['agent-profile-card-enhanced']}`}>
            <div className={`${styles['profile-cover']}`} />
            <div className={`${styles['profile-avatar-section']}`}>
              <div className={`${styles['agent-avatar-lg-enhanced']}`} style={{ background: getAvatarGradient(agent.sexe) }}>
                {getInitials(agent.prenomFr, agent.nomFr)}
              </div>
              <h2 className={`${styles['agent-name-lg']}`}>{agent.prenomFr} {agent.nomFr}</h2>
              <p className={`${styles['agent-function-enhanced']}`}>{agent.fonctionFr || agent.grade?.libelleFr || '-'}</p>
              <div className={`${styles['profile-badges']}`}>
                <span className={`badge badge-dot ${STATUT_STYLES[agent.statut]?.badge || 'badge-gray'}`}>{agent.statut}</span>
                <span className={`badge ${CARRIERE_STYLES[agent.statutCarriere] || 'badge-gray'}`}>{agent.statutCarriere?.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <div className={`${styles['profile-quick-info']}`}>
              <QuickInfo icon={<IdCard size={16} />} label={t('agents.matricule')} value={agent.matricule} />
              <QuickInfo icon={<CreditCard size={16} />} label={t('agents.cin')} value={agent.cin} />
              <QuickInfo icon={<Calendar size={16} />} label={t('agents.birth_date')} value={`${formatDate(agent.dateNaissance)} (${calculateAge(agent.dateNaissance)})`} />
              {anciennete && <QuickInfo icon={<CalendarClock size={16} />} label={t('agents.seniority')} value={`${anciennete.annees} ${t('agents.years')} ${anciennete.mois} ${t('agents.months')}`} />}
            </div>
          </div>

          <div className={`card ${styles['profile-contact-card']}`}>
            <h4 className={`${styles['profile-card-title']}`}><Mail size={16} />{t('agents.contact_info')}</h4>
            <div className={`${styles['profile-contact-list']}`}>
              {agent.email && <a href={`mailto:${agent.email}`} className={`${styles['profile-contact-item']}`}><Mail size={15} /><span>{agent.email}</span></a>}
              {agent.telephone && <a href={`tel:${agent.telephone}`} className={`${styles['profile-contact-item']}`}><Phone size={15} /><span>{agent.telephone}</span></a>}
              {agent.adresseFr && <div className={`${styles['profile-contact-item']}`}><MapPin size={15} /><span>{agent.adresseFr}</span></div>}
              {!hasContact && <p className={`${styles['profile-no-contact']}`}>{t('agents.no_documents')}</p>}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="detail-main">
          <div className="card">
            <div className={`tabs ${styles['tabs-enhanced']}`}>
              {tabs.map((tab) => (
                <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                  <span className={`${styles['tab-icon']}`}>{tab.icon}</span>
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && <span className={`${styles['tab-count']}`}>{tab.count}</span>}
                </button>
              ))}
            </div>

            <div className={`card-body ${styles['tab-content']}`}>
              {activeTab === 'overview' && <OverviewTab agent={agent} t={t} />}
              {activeTab === 'career' && <CareerTab agent={agent} t={t} />}
              {activeTab === 'diplomas' && <DiplomasTab agent={agent} t={t} />}
              {activeTab === 'documents' && <DocumentsTab agent={agent} t={t} />}
              {activeTab === 'contact' && <ContactTab agent={agent} t={t} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Sub-components for each tab */

const QuickInfo: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className={`${styles['profile-quick-item']}`}>
    {icon}
    <div>
      <span className={`${styles['profile-quick-label']}`}>{label}</span>
      <span className={`${styles['profile-quick-value']}`}>{value}</span>
    </div>
  </div>
);

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number | null | undefined }> = ({ icon, label, value }) => (
  <div className={`${styles['info-card-item']}`}>
    <div className={`${styles['info-card-icon']}`}>{icon}</div>
    <div className={`${styles['info-card-content']}`}>
      <span className={`${styles['info-card-label']}`}>{label}</span>
      <span className={`${styles['info-card-value']}`}>{value ?? '-'}</span>
    </div>
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <h3 className={`${styles['info-section-title']}`}>{icon}{title}</h3>
);

const OverviewTab: React.FC<{ agent: any; t: any }> = ({ agent, t }) => (
  <>
    {/* Professional info */}
    <div className={`${styles['info-section']}`}>
      <SectionTitle icon={<Briefcase size={18} />} title={t('agents.professional_info')} />
      <div className={`${styles['info-cards-grid']}`}>
        <InfoCard icon={<Building2 size={18} />} label={t('agents.structure')} value={agent.structure?.libelleFr} />
        <InfoCard icon={<Award size={18} />} label={t('agents.corps')} value={agent.corps?.libelleFr} />
        <InfoCard icon={<BriefcaseBusiness size={18} />} label={t('agents.cadre')} value={agent.cadre?.libelleFr} />
        <InfoCard icon={<Award size={18} />} label={t('agents.grade')} value={agent.grade?.libelleFr} />
        {agent.echelle && <InfoCard icon={<Award size={18} />} label="Échelle" value={agent.echelle.libelleFr} />}
        {agent.echelon && <InfoCard icon={<Award size={18} />} label={t('agents.echelon')} value={`Échelon ${agent.echelon.numero} (Indice ${agent.echelon.indice})`} />}
        {agent.indice && <InfoCard icon={<Award size={18} />} label={t('agents.indice')} value={agent.indice} />}
      </div>
    </div>

    {/* Key dates */}
    <div className={`${styles['info-section']}`}>
      <SectionTitle icon={<Calendar size={18} />} title={t('agents.key_dates')} />
      <div className={`${styles['dates-grid']}`}>
        <DateCard variant="accent" icon={<Calendar size={20} />} label={t('agents.recruitment')} value={formatDate(agent.dateRecrutement)} />
        <DateCard variant="primary" icon={<Award size={20} />} label={t('agents.titularisation')} value={formatDate(agent.dateTitularisation)} />
        {agent.dateFinContrat && <DateCard variant="warning" icon={<CalendarClock size={20} />} label="Fin de contrat" value={formatDate(agent.dateFinContrat)} />}
      </div>
    </div>

    {/* Personal info */}
    <div className={`${styles['info-section']}`}>
      <SectionTitle icon={<User size={18} />} title={t('agents.personal_info')} />
      <div className={`${styles['info-cards-grid']}`}>
        <InfoCard icon={<User size={18} />} label={t('agents.sexe')} value={agent.sexe === 'M' ? t('agents.masculine') : t('agents.feminine')} />
        <InfoCard icon={<Globe size={18} />} label={t('agents.nationality')} value={agent.nationalite} />
        <InfoCard icon={<Heart size={18} />} label={t('agents.family_situation')} value={agent.situationFamiliale} />
        <InfoCard icon={<Baby size={18} />} label={t('agents.children')} value={agent.nbEnfants ?? 0} />
      </div>
    </div>

    {/* Retirement */}
    <div className={`${styles['info-section']}`}>
      <SectionTitle icon={<Briefcase size={18} />} title="Retraite" />
      <div className={`${styles['info-cards-grid']}`}>
        <InfoCard icon={<Award size={18} />} label={t('agents.retirement_fund')} value={agent.caisseRetraite} />
        <InfoCard icon={<IdCard size={18} />} label={t('agents.retirement_number')} value={agent.matriculeRetraite} />
      </div>
    </div>
  </>
);

const DateCard: React.FC<{ variant: string; icon: React.ReactNode; label: string; value: string }> = ({ variant, icon, label, value }) => (
  <div className={`date-card ${variant}`}>
    <div className={`${styles['date-card-icon']}`}>{icon}</div>
    <div className={`${styles['date-card-content']}`}>
      <span className={`${styles['date-card-label']}`}>{label}</span>
      <span className={`${styles['date-card-value']}`}>{value}</span>
    </div>
  </div>
);

const CareerTab: React.FC<{ agent: any; t: any }> = ({ agent, t }) => (
  <div className={`${styles['info-section']}`}>
    <SectionTitle icon={<Clock size={18} />} title={t('agents.career_timeline')} />
    {agent.carriereHistorique?.length > 0 ? (
      <div className={`${styles['timeline']}`}>
        {agent.carriereHistorique.map((event: any, idx: number) => (
          <div key={event.id} className={`timeline-item ${idx === 0 ? 'latest' : ''}`}>
            <div className={`${styles['timeline-dot']}`} />
            <div className={`${styles['timeline-content']}`}>
              <div className={`${styles['timeline-header']}`}>
                <span className={`${styles['timeline-event']}`}>{event.evenement}</span>
                <span className={`${styles['timeline-date']}`}>{formatDate(event.dateEffet)}</span>
              </div>
              {event.descriptionFr && <p className={`${styles['timeline-desc']}`}>{event.descriptionFr}</p>}
              {(event.gradeApresId || event.echelonApres) && (
                <div className={`${styles['timeline-meta']}`}>
                  {event.gradeAvantId && event.gradeApresId && (
                    <span className={`${styles['timeline-meta-item']}`}><Award size={13} /> Grade: {event.gradeAvantId} → {event.gradeApresId}</span>
                  )}
                  {event.echelonAvant && event.echelonApres && (
                    <span className={`${styles['timeline-meta-item']}`}><Award size={13} /> Échelon: {event.echelonAvant} → {event.echelonApres}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState icon={<Clock />} message={t('agents.no_career_history')} />
    )}
  </div>
);

const DiplomasTab: React.FC<{ agent: any; t: any }> = ({ agent, t }) => (
  <div className={`${styles['info-section']}`}>
    <SectionTitle icon={<GraduationCap size={18} />} title={t('agents.diplomas')} />
    {agent.diplomes?.length > 0 ? (
      <div className={`${styles['diplomas-grid']}`}>
        {agent.diplomes.map((dip: any) => (
          <div key={dip.id} className={`${styles['diploma-card']}`}>
            <div className={`${styles['diploma-icon']}`}><GraduationCap size={24} /></div>
            <div className={`${styles['diploma-content']}`}>
              <h4 className={`${styles['diploma-title']}`}>{dip.intituleFr}</h4>
              {dip.etablissement && (
                <p className={`${styles['diploma-institution']}`}><Building2 size={13} />{dip.etablissement}</p>
              )}
              {dip.anneeObtention && <span className={`${styles['diploma-year']}`}><Calendar size={13} />{dip.anneeObtention}</span>}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState icon={<GraduationCap />} message={t('agents.no_diplomas')} />
    )}
  </div>
);

const DocumentsTab: React.FC<{ agent: any; t: any }> = ({ agent, t }) => (
  <div className={`${styles['info-section']}`}>
    <SectionTitle icon={<FileText size={18} />} title={t('agents.documents')} />
    {agent.piecesJointes?.length > 0 ? (
      <div className={`${styles['documents-list']}`}>
        {agent.piecesJointes.map((doc: any) => (
          <div key={doc.id} className={`${styles['document-item']}`}>
            <div className={`${styles['document-icon']}`}><FileText size={20} /></div>
            <div className={`${styles['document-content']}`}>
              <span className={`${styles['document-type']}`}>{doc.type}</span>
              <span className={`${styles['document-name']}`}>{doc.nomFichier}</span>
              <span className={`${styles['document-meta']}`}>{doc.mimeType} · {(doc.taille / 1024).toFixed(1)} KB</span>
            </div>
            <button className="btn btn-ghost btn-icon" title="Télécharger"><Download size={18} /></button>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState icon={<FileText />} message={t('agents.no_documents')} />
    )}
  </div>
);

const ContactTab: React.FC<{ agent: any; t: any }> = ({ agent, t }) => (
  <>
    <div className={`${styles['info-section']}`}>
      <SectionTitle icon={<Mail size={18} />} title={t('agents.contact_info')} />
      <div className={`${styles['contact-cards-grid']}`}>
        {agent.email && (
          <a href={`mailto:${agent.email}`} className={`${styles['contact-card-link']}`}>
            <div className={`${styles['contact-card']}`}>
              <div className={`${styles['contact-card-icon']} blue`}><Mail size={22} /></div>
              <div className={`${styles['contact-card-content']}`}>
                <span className={`${styles['contact-card-label']}`}>{t('agents.email')}</span>
                <span className={`${styles['contact-card-value']}`}>{agent.email}</span>
              </div>
            </div>
          </a>
        )}
        {agent.telephone && (
          <a href={`tel:${agent.telephone}`} className={`${styles['contact-card-link']}`}>
            <div className={`${styles['contact-card']}`}>
              <div className={`${styles['contact-card-icon']} green`}><Phone size={22} /></div>
              <div className={`${styles['contact-card-content']}`}>
                <span className={`${styles['contact-card-label']}`}>{t('agents.phone')}</span>
                <span className={`${styles['contact-card-value']}`}>{agent.telephone}</span>
              </div>
            </div>
          </a>
        )}
        {agent.adresseFr && (
          <div className={`${styles['contact-card']}`}>
            <div className={`${styles['contact-card-icon']} gold`}><MapPin size={22} /></div>
            <div className={`${styles['contact-card-content']}`}>
              <span className={`${styles['contact-card-label']}`}>{t('agents.address')}</span>
              <span className={`${styles['contact-card-value']}`}>{agent.adresseFr}</span>
            </div>
          </div>
        )}
      </div>
    </div>
    <div className={`${styles['info-section']}`}>
      <SectionTitle icon={<UsersIcon size={18} />} title={t('agents.personal_info')} />
      <div className={`${styles['info-cards-grid']}`}>
        <InfoCard icon={<Calendar size={18} />} label={t('agents.birth_date')} value={formatDate(agent.dateNaissance)} />
        {agent.lieuNaissanceFr && <InfoCard icon={<MapPin size={18} />} label={t('agents.birth_place')} value={agent.lieuNaissanceFr} />}
        <InfoCard icon={<Globe size={18} />} label={t('agents.nationality')} value={agent.nationalite} />
        <InfoCard icon={<Heart size={18} />} label={t('agents.family_situation')} value={agent.situationFamiliale} />
        <InfoCard icon={<Baby size={18} />} label={t('agents.children')} value={agent.nbEnfants ?? 0} />
      </div>
    </div>
  </>
);

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className={`${styles['empty-state-sm']}`}>
    {icon}
    <p>{message}</p>
  </div>
);

export default AgentDetail;