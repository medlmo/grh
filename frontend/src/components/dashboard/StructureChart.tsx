import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

interface Props {
  data: Array<{ structure: string; count: number }>;
  tooltipStyle: React.CSSProperties;
}

const StructureChart: React.FC<Props> = ({ data, tooltipStyle }) => (
  <div className="card-body" style={{ height: Math.max(220, data.length * 42) }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="structure" width={160} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v) + ' agent(s)', 'Effectif']} />
        <Bar dataKey="count" name="Agents" fill="#1e3a5f" radius={[0,4,4,0]}>
          {data.map((_, i) => <Cell key={i} fill={i === 0 ? '#1e3a5f' : i === 1 ? '#2d5fa0' : '#3b82f6'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default StructureChart;