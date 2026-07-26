import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { 
  Users, 
  UserCheck, 
  Clock, 
  CalendarCheck 
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!stats) return null;

  const COLORS = ['#1e3a5f', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const GENDER_COLORS = { M: '#3b82f6', F: '#ec4899' };

  return (
    <div className="dashboard pb-8">
      <div className="page-header">
        <h1>{t('nav.dashboard')}</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-content">
            <div className="stat-value">{stats.totalAgents}</div>
            <div className="stat-label">{t('dashboard.total_agents')}</div>
          </div>
          <div className="stat-icon blue">
            <Users />
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-content">
            <div className="stat-value">
              {stats.parStatut.find((s: any) => s.statut === 'TITULAIRE')?._count || 0}
            </div>
            <div className="stat-label">{t('dashboard.active_agents')} (Titulaires)</div>
          </div>
          <div className="stat-icon green">
            <UserCheck />
          </div>
        </div>

        <div className="stat-card gold">
          <div className="stat-content">
            <div className="stat-value">{stats.congesEnAttente}</div>
            <div className="stat-label">{t('dashboard.pending_leaves')}</div>
          </div>
          <div className="stat-icon gold">
            <Clock />
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-content">
            <div className="stat-value">{stats.congesApprouves}</div>
            <div className="stat-label">{t('dashboard.approved_leaves')}</div>
          </div>
          <div className="stat-icon blue">
            <CalendarCheck />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dashboard.gender_distribution')}</h3>
          </div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.parSexe}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="sexe"
                  label
                >
                  {stats.parSexe.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[entry.sexe as 'M'|'F'] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dashboard.age_pyramid')}</h3>
          </div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pyramideAges}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="tranche" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="hommes" name="Hommes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="femmes" name="Femmes" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('dashboard.upcoming_retirements')} (5 ans)</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Structure</th>
                <th>Âge</th>
                <th>Année prévue</th>
              </tr>
            </thead>
            <tbody>
              {stats.retraitesProches?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-8">Aucun départ à la retraite prévu dans les 5 prochaines années.</td>
                </tr>
              ) : (
                stats.retraitesProches?.map((agent: any) => (
                  <tr key={agent.id}>
                    <td className="font-medium">{agent.matricule}</td>
                    <td>{agent.nom}</td>
                    <td>{agent.structure || '-'}</td>
                    <td>{agent.age} ans</td>
                    <td>
                      <span className="badge badge-warning">
                        {agent.anneeRetraite}
                      </span>
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

export default Dashboard;
