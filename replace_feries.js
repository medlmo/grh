const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/parametrage/FeriesTab.tsx', 'utf8');

// Add import
content = content.replace(
  "import { useTranslation } from 'react-i18next';",
  "import { useTranslation } from 'react-i18next';\nimport styles from './FeriesTab.module.css';"
);

const classesToReplace = [
  "feries-header","feries-header-title","feries-year-picker","feries-year-btn",
  "feries-year-value","feries-stats","feries-stat","feries-stat-icon","feries-stat-content",
  "feries-stat-value","feries-stat-label","feries-calendar-strip","feries-month-card",
  "feries-month-header","feries-month-name","feries-month-count","feries-month-list",
  "feries-month-item","feries-month-dot","feries-month-day","feries-filters","feries-search",
  "feries-filter-pills","feries-filter-pill","feries-table","feries-month-row","feries-date-cell",
  "feries-date-badge","feries-date-weekday","feries-label-ar","feries-type-badge",
  "feries-empty","feries-empty-icon","form-group-full","feries-modal-grid","feries-toggle",
  "feries-toggle-label", "empty", "mobile", "is-fixed"
];

content = content.replace(/className=\"([^\"]+)\"/g, (match, p1) => {
  const parts = p1.split(' ');
  const newParts = parts.map(p => classesToReplace.includes(p) ? `\${styles['${p}']}` : p);
  
  if (parts.join(' ') === newParts.join(' ')) return match;
  
  return 'className={`' + newParts.join(' ') + '`}'
});

fs.writeFileSync('frontend/src/components/parametrage/FeriesTab.tsx', content);
