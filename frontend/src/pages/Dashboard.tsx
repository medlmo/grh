import React, { useEffect, useState } from 'react';
import api from '../api/client';
import styles from './Dashboard.module.css';
import {
  Users, UserMinus, Clock,
  ClipboardList, TrendingUp,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Mappings libellés ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  ANNUEL:               'Annuel',
  MALADIE_COURTE:       'Maladie C.D.',
  MALADIE_MOYENNE:      'Maladie M.D.',
  MALADIE_LONGUE:       'Maladie L.D.',
  MATERNITE:            'Maternité',
  PATERNITE:            'Paternité',
  SANS_SOLDE:           'Sans solde',
  AUTORISATION_ABSENCE: 'Autorisation',
  EXCEPTIONNEL:         'Exceptionnel',
};

const STATUT_CARRIERE_LABELS: Record<string, string> = {
  EN_ACTIVITE:      'En activité',
  DETACHEMENT:      'Détachement',
  DISPONIBILITE:    'Disponibilité',
  MIS_A_DISPOSITION:'Mis à disposition',
  REINTEGRATION:    'Réintégration',
  RETRAITE:         'Retraite',
  DEMISSION:        'Démission',
};

const STATUT_CARRIERE_COLORS: Record<string, string> = {
  EN_ACTIVITE:      '#10b981',
  DETACHEMENT:      '#3b82f6',
  DISPONIBILITE:    '#f59e0b',
  MIS_A_DISPOSITION:'#8b5cf6',
  REINTEGRATION:    '#06b6d4',
  RETRAITE:         '#6b7280',
  DEMISSION:        '#ef4444',
};

const TYPE_COLORS = ['#3b82f6','#ef4444','#f59e0b','#8b5cf6','#ec4899','#10b981','#06b6d4','#6b7280','#1e3a5f'];

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1, 1).toLocaleDateString('fr-MA', { month: 'short', year: '2-digit' });
};

const tooltipStyle = {
  borderRadius: '8px', border: 'none',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
  fontSize: '13px',
};

// ─── Composant KPI Card ───────────────────────────────────────────────────────

const KpiCard: React.FC<{
  value: number | string;
  label: string;
  sub?: string;
  color: 'blue' | 'green' | 'gold' | 'red' | 'purple' | 'teal';
  icon: React.ReactNode;
  urgent?: boolean;
}> = ({ value, label, sub, color, icon, urgent }) => (
  <div className={`stat-card ${color}${urgent ? ' ring-2 ring-red-400' : ''}`}>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
    <div className={`stat-icon ${color}`}>{icon}</div>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }
  if (!stats) return null;

  const hommes = stats.parSexe.find((s: any) => s.sexe === 'M')?.count ?? 0;
  const femmes = stats.parSexe.find((s: any) => s.sexe === 'F')?.count ?? 0;
  const statutCarriereData = stats.parStatutCarriere.map((s: any) => ({
    name:  STATUT_CARRIERE_LABELS[s.statut] ?? s.statut,
    value: s.count,
    key:   s.statut,
  }));

  const congesTypeData = stats.congesParType.map((c: any) => ({
    name:  TYPE_LABELS[c.type] ?? c.type,
    value: c.count,
    jours: Math.round(c.jours),
  }));

  const evolutionData = stats.evolutionMensuelle.map((m: any) => ({
    mois:  formatMonth(m.mois),
    total: m.total,
  }));

  const structureData = [...stats.parStructure]
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className={`${styles.page} pb-8`}>
      <div className="page-header">
        <div>
          <h1>Tableau de bord RH</h1>
          <p className="page-subtitle">Vue d'ensemble — Région Souss-Massa</p>
        </div>
      </div>

      {/* ── Section 1 : 6 indicateurs clés ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          value={stats.totalAgents}
          label="Total agents"
          sub={`${hommes} H · ${femmes} F`}
          color="blue"
          icon={<Users />}
        />
        <KpiCard
          value={stats.absentsAujourdhui}
          label="Absents aujourd'hui"
          sub="Congés en cours"
          color={stats.absentsAujourdhui > 0 ? 'red' : 'blue'}
          icon={<UserMinus />}
          urgent={stats.absentsAujourdhui > 0}
        />
        <KpiCard
          value={stats.congesEnAttente}
          label="Demandes en attente"
          sub="N1 · N2 · DRH"
          color="gold"
          icon={<Clock />}
          urgent={stats.congesEnAttente > 0}
        />
        <KpiCard
          value={stats.decisionsNonSignees}
          label="Décisions à signer"
          sub="En attente de signature"
          color={stats.decisionsNonSignees > 0 ? 'purple' : 'blue'}
          icon={<ClipboardList />}
          urgent={stats.decisionsNonSignees > 0}
        />
      </div>

      {/* ── Section 2 : Pyramide des âges + Statut de carrière ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Pyramide des âges — 2/3 */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="card-title">Pyramide des âges</h3>
            <span className="text-xs text-gray-400">par tranche · hommes / femmes</span>
          </div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pyramideAges} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="tranche" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="hommes" name="Hommes" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="femmes" name="Femmes" fill="#ec4899" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statut de carrière — 1/3 */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Statut de carrière</h3>
          </div>
          <div className="card-body" style={{ height: 280 }}>
            {statutCarriereData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statutCarriereData}
                    cx="50%" cy="45%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {statutCarriereData.map((entry: any) => (
                      <Cell key={entry.key} fill={STATUT_CARRIERE_COLORS[entry.key] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [v + ' agent(s)', n]} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3 : Évolution mensuelle + Congés par type ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Évolution mensuelle des demandes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Demandes de congés — 12 mois</h3>
            <span className="text-xs text-gray-400">Nouvelles demandes par mois</span>
          </div>
          <div className="card-body" style={{ height: 260 }}>
            {evolutionData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Aucune demande sur la période</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v + ' demande(s)', 'Total']} />
                  <Bar dataKey="total" name="Demandes" fill="#1e3a5f" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Congés par type (exercice en cours) */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Répartition des congés par type</h3>
            <span className="text-xs text-gray-400">Exercice {new Date().getFullYear()} · hors refusés/annulés</span>
          </div>
          <div className="card-body" style={{ height: 260 }}>
            {congesTypeData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Aucun congé cette année</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={congesTypeData}
                    cx="50%" cy="45%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {congesTypeData.map((_: any, i: number) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any, n: any, p: any) => [
                      `${v} demande(s) · ${p.payload.jours} j`,
                      n,
                    ]}
                  />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 4 : Effectif par structure ──────────────────────────── */}
      {structureData.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">Effectif par structure (top 8)</h3>
            <span className="text-xs text-gray-400">Nombre d'agents affectés</span>
          </div>
          <div className="card-body" style={{ height: Math.max(220, structureData.length * 42) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={structureData}
                margin={{ left: 8, right: 32, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category" dataKey="structure" width={160}
                  axisLine={false} tickLine={false} tick={{ fontSize: 11 }}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v + ' agent(s)', 'Effectif']} />
                <Bar dataKey="count" name="Agents" fill="#1e3a5f" radius={[0,4,4,0]}>
                  {structureData.map((_: any, i: number) => (
                    <Cell key={i} fill={i === 0 ? '#1e3a5f' : i === 1 ? '#2d5fa0' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Section 5 : Départs à la retraite prochains ─────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Départs à la retraite prochains</h3>
          <span className="text-xs text-gray-400">Agents EN_ACTIVITE · âge ≥ 58 ans · retraite à 63 ans</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Grade</th>
                <th>Structure</th>
                <th>Âge</th>
                <th>Année prévisionnelle</th>
                <th>Délai</th>
              </tr>
            </thead>
            <tbody>
              {stats.retraitesProches?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-8">
                    Aucun agent proche de la retraite.
                  </td>
                </tr>
              ) : (
                stats.retraitesProches?.map((a: any) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.matricule}</td>
                    <td>{a.nom}</td>
                    <td className="text-gray-500 text-sm">{a.grade}</td>
                    <td className="text-gray-500 text-sm">{a.structure}</td>
                    <td>{a.age} ans</td>
                    <td>
                      <span className={`badge ${a.dansAns <= 1 ? 'badge-danger' : a.dansAns <= 2 ? 'badge-warning' : 'badge-info'}`}>
                        {a.anneeRetraite}
                      </span>
                    </td>
                    <td>
                      <span className={`text-sm font-medium ${a.dansAns <= 1 ? 'text-red-600' : a.dansAns <= 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {a.dansAns <= 0 ? 'Cette année' : `dans ${a.dansAns} an${a.dansAns > 1 ? 's' : ''}`}
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
