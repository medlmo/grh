import React from 'react';

interface StatsCardProps {
  variant: 'blue' | 'green' | 'gold' | 'red';
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ variant, icon, value, label, className = '' }) => {
  return (
    <div className={`stat-card stat-card-enhanced ${variant} ${className}`}>
      <div className="stat-card-top-row">
        <div className={`stat-icon ${variant}`}>{icon}</div>
        <div className="stat-content min-w-0">
          <div className="stat-value truncate" title={typeof value === 'string' ? value : undefined}>
            {value}
          </div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;