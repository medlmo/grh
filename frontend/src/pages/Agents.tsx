import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  LayoutGrid,
  List,
  Users,
  SlidersHorizontal,
  X,
  ChevronDown,
  Building2,
  Venus,
  Briefcase,
  ArrowUpDown,
} from 'lucide-react';
import { Routes, Route, Link } from 'react-router-dom';
import AgentForm from '../components/agents/AgentForm';
import AgentDetail from '../components/agents/AgentDetail';
import styles from './Agents.module.css';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  STATUT_STYLES,
  CARRIERE_STYLES,
  getInitials,
  getAvatarGradient,
  statutLabel,
  carriereLabel,
} from '../utils/agentHelpers';

type SortKey = 'name' | 'name_desc' | 'matricule' | 'recent' | 'oldest';

const filterAndSortAgents = (agents: any[], filters: {
  statut: string;
  structure: string;
  gender: string;
  carriere: string;
  sortBy: SortKey;
}) => {
  return agents
    .filter((agent) => {
      if (filters.statut && agent.statut !== filters.statut) return false;
      if (filters.structure && agent.structureId !== Number(filters.structure)) return false;
      if (filters.gender && agent.sexe !== filters.gender) return false;
      if (filters.carriere && agent.statutCarriere !== filters.carriere) return false;
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return `${a.prenomFr} ${a.nomFr}`.localeCompare(`${b.prenomFr} ${b.nomFr}`);
        case 'name_desc':
          return `${b.prenomFr} ${b.nomFr}`.localeCompare(`${a.prenomFr} ${a.nomFr}`);
        case 'matricule':
          return (a.matricule || '').localeCompare(b.matricule || '');
        case 'recent':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        default:
          return 0;
      }
    });
};

const AgentsList: React.FC = () => {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterStructure, setFilterStructure] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterCarriere, setFilterCarriere] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; agentId: number | null }>({
    isOpen: false,
    agentId: null,
  });

  const fetchAgents = useCallback(async () => {
    try {
      const response = await api.get('/agents', { params: { search: searchTerm } });
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAgents(), 500);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchAgents]);

  useEffect(() => {
    api.get('/parametrage/structures')
      .then((res) => setStructures(res.data))
      .catch(console.error);
  }, []);

  const handleDelete = async () => {
    const id = deleteModal.agentId;
    if (!id) return;
    try {
      await api.delete(`/agents/${id}`);
      setDeleteModal({ isOpen: false, agentId: null });
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      setDeleteModal({ isOpen: false, agentId: null });
    }
  };

  const activeFilterCount = useMemo(
    () => [filterStatut, filterStructure, filterGender, filterCarriere].filter(Boolean).length,
    [filterStatut, filterStructure, filterGender, filterCarriere]
  );

  const filteredAgents = useMemo(
    () => filterAndSortAgents(agents, { statut: filterStatut, structure: filterStructure, gender: filterGender, carriere: filterCarriere, sortBy }),
    [agents, filterStatut, filterStructure, filterGender, filterCarriere, sortBy]
  );

  return (
    <div className={styles['agents-page']}>
      <div className="page-header">
        <div>
          <h1>{t('agents.title')}</h1>
          <p className={`${styles['page-subtitle']}`}>{t('agents.results_count', { count: filteredAgents.length })}</p>
        </div>
        <div className="page-actions">
          <Link to="/agents/nouveau" className="btn btn-primary">
            <Plus size={18} />
            {t('agents.add_new')}
          </Link>
        </div>
      </div>

      <div className="card">
        <div className={`card-header ${styles['agents-filter-header']}`}>
          <div className={`filters-bar w-full mb-0`}>
            <div className={`search-input`}>
              <Search />
              <input type="text" placeholder={t('common.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select className={`filter-select`} value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
              <option value="">{t('agents.all_statuses')}</option>
              <option value="TITULAIRE">{t('agents.titulaires')}</option>
              <option value="STAGIAIRE">{t('agents.stagiaires')}</option>
              <option value="CONTRACTUEL">{t('agents.contractuels')}</option>
              <option value="JOURNALIER">{t('agents.contractuels')}</option>
            </select>
            <select className={`filter-select`} value={filterStructure} onChange={(e) => setFilterStructure(e.target.value)}>
              <option value="">{t('agents.all_structures')}</option>
              {structures.map((s) => (<option key={s.id} value={s.id}>{s.libelleFr}</option>))}
            </select>
            <button className={`btn btn-outline ${styles['btn-advanced-filters']} ${showAdvancedFilters ? styles.active : ''}`} onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <SlidersHorizontal size={16} />
              {t('agents.advanced_filters')}
              {activeFilterCount > 0 && <span className={`${styles['filter-count-badge']}`}>{activeFilterCount}</span>}
              <ChevronDown size={14} className={`${styles['chevron-rotate']} ${showAdvancedFilters ? styles.rotated : ''}`} />
            </button>
            <div className={`${styles['view-toggle']}`}>
              <button className={`${styles['view-toggle-btn']} ${viewMode === 'table' ? styles.active : ''}`} onClick={() => setViewMode('table')} title={t('agents.view_table')}><List size={18} /></button>
              <button className={`${styles['view-toggle-btn']} ${viewMode === 'grid' ? styles.active : ''}`} onClick={() => setViewMode('grid')} title={t('agents.view_grid')}><LayoutGrid size={18} /></button>
            </div>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className={`${styles['advanced-filters-panel']}`}>
            <div className={`${styles['advanced-filters-header']}`}>
              <h4 className={`${styles['advanced-filters-title']}`}><SlidersHorizontal size={16} />{t('agents.advanced_filters')}</h4>
              <div className={`${styles['advanced-filters-actions']}`}>
                {activeFilterCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatut(''); setFilterStructure(''); setFilterGender(''); setFilterCarriere(''); setSortBy('name'); }}>
                    <X size={14} />{t('agents.reset_filters')}
                  </button>
                )}
              </div>
            </div>
            <div className={`${styles['advanced-filters-grid']}`}>
              <div className={`${styles['filter-group']}`}>
                <label className={`${styles['filter-group-label']}`}><Venus size={14} />{t('agents.filter_by_gender')}</label>
                <select className={`filter-select w-full`} value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                  <option value="">{t('agents.all_genders')}</option>
                  <option value="M">{t('agents.masculine')}</option>
                  <option value="F">{t('agents.feminine')}</option>
                </select>
              </div>
              <div className={`${styles['filter-group']}`}>
                <label className={`${styles['filter-group-label']}`}><Briefcase size={14} />{t('agents.filter_by_career')}</label>
                <select className={`filter-select w-full`} value={filterCarriere} onChange={(e) => setFilterCarriere(e.target.value)}>
                  <option value="">{t('agents.all_career_statuses')}</option>
                  <option value="EN_ACTIVITE">{t('agents.en_activite')}</option>
                  <option value="DETACHEMENT">{t('agents.detachment')}</option>
                  <option value="DISPONIBILITE">{t('agents.availability')}</option>
                  <option value="RETRAITE">{t('agents.retired')}</option>
                </select>
              </div>
              <div className={`${styles['filter-group']}`}>
                <label className={`${styles['filter-group-label']}`}><ArrowUpDown size={14} />{t('agents.sort_by')}</label>
                <select className={`filter-select w-full`} value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                  <option value="name">{t('agents.sort_name')}</option>
                  <option value="name_desc">{t('agents.sort_name_desc')}</option>
                  <option value="matricule">{t('agents.sort_matricule')}</option>
                  <option value="recent">{t('agents.sort_recent')}</option>
                  <option value="oldest">{t('agents.sort_oldest')}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : filteredAgents.length === 0 ? (
          <div className={`empty-state`}><Users /><h3>{t('agents.no_agents')}</h3><p>{t('agents.no_agents_desc')}</p></div>
        ) : viewMode === 'table' ? (
          <div className={`table-container`}>
            <table className={`data-table ${styles['agents-table']}`}>
              <thead>
                <tr>
                  <th>{t('agents.name')}</th>
                  <th>{t('agents.matricule')}</th>
                  <th>{t('agents.structure')}</th>
                  <th>{t('agents.grade')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('agents.career_status')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className={`${styles['agent-row']}`}>
                    <td>
                      <div className={`${styles['agent-cell']}`}>
                        <div className={`${styles['agent-avatar-sm']}`} style={{ background: getAvatarGradient(agent.sexe) }}>
                          {getInitials(agent.prenomFr, agent.nomFr)}
                        </div>
                        <div className={`${styles['agent-cell-info']}`}>
                          <span className={`${styles['agent-cell-name']}`}>{agent.prenomFr} {agent.nomFr}</span>
                          {agent.fonctionFr && <span className={`${styles['agent-cell-sub']}`}>{agent.fonctionFr}</span>}
                        </div>
                      </div>
                    </td>
                    <td><span className={`${styles['matricule-badge']}`}>{agent.matricule}</span></td>
                    <td>
                      <div className={`${styles['structure-cell']}`}>
                        <Building2 size={14} className={`${styles['structure-icon']}`} />
                        <span>{agent.structure?.libelleFr || '-'}</span>
                      </div>
                    </td>
                    <td>{agent.grade?.libelleFr || '-'}</td>
                    <td>
                      <span className={`badge badge-dot ${STATUT_STYLES[agent.statut]?.badge || 'badge-gray'}`}>
                        {statutLabel(agent.statut, t)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${CARRIERE_STYLES[agent.statutCarriere] || 'badge-gray'}`}>
                        {carriereLabel(agent.statutCarriere, t)}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/agents/${agent.id}`} className="btn-icon text-gray-500 hover:text-primary-600 hover:bg-primary-50" title={t('agents.view_profile')}><Eye size={18} /></Link>
                        <Link to={`/agents/${agent.id}/edit`} className="btn-icon text-gray-500 hover:text-info hover:bg-blue-50" title={t('common.edit')}><Edit size={18} /></Link>
                        <button onClick={() => setDeleteModal({ isOpen: true, agentId: agent.id })} className="btn-icon text-gray-500 hover:text-danger hover:bg-red-50" title={t('common.delete')}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`${styles['agents-grid']}`}>
            {filteredAgents.map((agent) => (
              <Link to={`/agents/${agent.id}`} key={agent.id} className={`${styles['agent-card']}`}>
                <div className={`${styles['agent-card-top']}`}>
                  <div className={`${styles['agent-avatar-md']}`} style={{ background: getAvatarGradient(agent.sexe) }}>
                    {getInitials(agent.prenomFr, agent.nomFr)}
                  </div>
                  <span className={`badge badge-dot ${STATUT_STYLES[agent.statut]?.badge || 'badge-gray'}`}>{statutLabel(agent.statut, t)}</span>
                </div>
                <div className={`${styles['agent-card-body']}`}>
                  <h3 className={`${styles['agent-card-name']}`}>{agent.prenomFr} {agent.nomFr}</h3>
                  <p className={`${styles['agent-card-matricule']}`}>{agent.matricule}</p>
                  <div className={`${styles['agent-card-info']}`}>
                    <div className={`${styles['agent-card-info-row']}`}>
                      <span className={`${styles['agent-card-label']}`}>{t('agents.structure')}</span>
                      <span className={`${styles['agent-card-value']}`}>{agent.structure?.libelleFr || '-'}</span>
                    </div>
                    <div className={`${styles['agent-card-info-row']}`}>
                      <span className={`${styles['agent-card-label']}`}>{t('agents.grade')}</span>
                      <span className={`${styles['agent-card-value']}`}>{agent.grade?.libelleFr || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['agent-card-footer']}`}>
                  <span className={`${styles['agent-card-action']}`}><Eye size={16} />{t('agents.view_profile')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, agentId: null })}
        onConfirm={handleDelete}
        title={t('common.confirm')}
        message="Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
      />
    </div>
  );
};

const Agents: React.FC = () => (
  <Routes>
    <Route path="/" element={<AgentsList />} />
    <Route path="/nouveau" element={<AgentForm />} />
    <Route path="/:id/edit" element={<AgentForm />} />
    <Route path="/:id" element={<AgentDetail />} />
  </Routes>
);

export default Agents;