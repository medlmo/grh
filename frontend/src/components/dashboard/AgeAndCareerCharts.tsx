import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

type TooltipStyle = React.CSSProperties;
type AgeData = { tranche: string; hommes: number; femmes: number };
type CareerData = { name: string; value: number; key: string };

interface Props {
  pyramideAges: AgeData[];
  statutCarriereData: CareerData[];
  statutColors: Record<string, string>;
  tooltipStyle: TooltipStyle;
  careerOnly?: boolean;
}

const AgeAndCareerCharts: React.FC<Props> = ({
  pyramideAges, statutCarriereData, statutColors, tooltipStyle, careerOnly = false,
}) => (
  <>
    {!careerOnly && (
      <div className="card-body" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pyramideAges} barCategoryGap="30%">
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
    )}
    {careerOnly && (
      <div className="card-body" style={{ height: 280 }}>
        {statutCarriereData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Aucune donnée</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statutCarriereData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name"
                label={({ percent }) => (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''} labelLine={false}>
                {statutCarriereData.map((entry) => <Cell key={entry.key} fill={statutColors[entry.key] ?? '#94a3b8'} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [String(v) + ' agent(s)', n]} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    )}
  </>
);

export default AgeAndCareerCharts;