import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

interface Props {
  evolutionData: { mois: string; total: number }[];
  congesTypeData: { name: string; value: number; jours: number }[];
  typeColors: string[];
  tooltipStyle: React.CSSProperties;
  typeOnly?: boolean;
}

const LeaveCharts: React.FC<Props> = ({ evolutionData, congesTypeData, typeColors, tooltipStyle, typeOnly = false }) => (
  <>
    {!typeOnly && (
      <div className="card-body" style={{ height: 260 }}>
        {evolutionData.length === 0 ? <div className="flex items-center justify-center h-full text-gray-400 text-sm">Aucune demande sur la période</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v) + ' demande(s)', 'Total']} />
              <Bar dataKey="total" name="Demandes" fill="#1e3a5f" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    )}
    {typeOnly && (
      <div className="card-body" style={{ height: 260 }}>
        {congesTypeData.length === 0 ? <div className="flex items-center justify-center h-full text-gray-400 text-sm">Aucun congé cette année</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={congesTypeData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name"
                label={({ percent }) => (percent ?? 0) > 0.06 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''} labelLine={false}>
                {congesTypeData.map((_, i) => <Cell key={i} fill={typeColors[i % typeColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [`${v} demande(s) · ${(p.payload as { jours: number }).jours} j`, n]} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    )}
  </>
);

export default LeaveCharts;