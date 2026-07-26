const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Agents.tsx', 'utf8');

// Add import
content = content.replace(
  "import AgentDetail from '../components/agents/AgentDetail';",
  "import AgentDetail from '../components/agents/AgentDetail';\nimport styles from './Agents.module.css';"
);

// Map of classes to replace
const classesToReplace = [
  'agents-page', 'page-subtitle', 'stats-grid-agents', 'stat-card-enhanced',
  'stat-card-top-row', 'stat-icon', 'stat-content', 'stat-value', 'stat-label',
  'stat-distribution', 'stat-dist-bar', 'stat-dist-fill', 'stat-dist-legend',
  'stat-dist-item', 'stat-dist-percent', 'agents-filter-header', 'filters-bar', 'search-input',
  'filter-select', 'btn-advanced-filters', 'filter-count-badge', 'view-toggle',
  'view-toggle-btn', 'advanced-filters-panel', 'advanced-filters-header',
  'advanced-filters-title', 'advanced-filters-actions', 'advanced-filters-grid',
  'filter-group', 'filter-group-label', 'empty-state', 'table-container',
  'agents-table', 'agent-row', 'agent-cell', 'agent-avatar-sm', 'agent-cell-info',
  'agent-cell-name', 'agent-cell-sub', 'matricule-badge', 'structure-cell',
  'structure-icon', 'agents-grid', 'agent-card', 'agent-card-top', 'agent-avatar-md',
  'agent-card-body', 'agent-card-name', 'agent-card-matricule', 'agent-card-info',
  'agent-card-info-row', 'agent-card-label', 'agent-card-value', 'agent-card-footer',
  'agent-card-action'
];

content = content.replace(/className=\"([^\"]+)\"/g, (match, p1) => {
  const parts = p1.split(' ');
  const newParts = parts.map(p => classesToReplace.includes(p) ? `\${styles['${p}']}` : p);
  
  if (parts.join(' ') === newParts.join(' ')) return match;
  
  return 'className={`' + newParts.join(' ') + '`}'
});

fs.writeFileSync('frontend/src/pages/Agents.tsx', content);
