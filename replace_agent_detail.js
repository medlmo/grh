const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/agents/AgentDetail.tsx', 'utf8');

// Add import
content = content.replace(
  "import { useParams, Link } from 'react-router-dom';",
  "import { useParams, Link } from 'react-router-dom';\nimport styles from './AgentDetail.module.css';"
);

// Map of classes to replace
const classesToReplace = [
  "detail-grid-enhanced","agent-profile-card-enhanced","profile-cover","profile-avatar-section","agent-avatar-lg-enhanced","agent-name-lg","agent-function-enhanced","profile-badges","profile-quick-info","profile-quick-item","profile-quick-label","profile-quick-value","profile-contact-card","profile-card-title","profile-contact-list","profile-contact-item","profile-no-contact","tabs-enhanced","tab","tab-icon","tab-count","tab-content","tab-panel","info-section","info-section-title","info-cards-grid","info-card-item","info-card-icon","info-card-content","info-card-label","info-card-value","dates-grid","date-card","date-card-icon","date-card-content","date-card-label","date-card-value","timeline","timeline-item","timeline-dot","latest","timeline-content","timeline-header","timeline-event","timeline-date","timeline-desc","timeline-meta","timeline-meta-item","diplomas-grid","diploma-card","diploma-icon","diploma-content","diploma-title","diploma-institution","diploma-year","documents-list","document-item","document-icon","document-content","document-type","document-name","document-meta","contact-cards-grid","contact-card-link","contact-card","contact-card-icon","contact-card-content","contact-card-label","contact-card-value","empty-state-sm"
];

content = content.replace(/className=\"([^\"]+)\"/g, (match, p1) => {
  const parts = p1.split(' ');
  const newParts = parts.map(p => classesToReplace.includes(p) ? `\${styles['${p}']}` : p);
  
  if (parts.join(' ') === newParts.join(' ')) return match;
  
  return 'className={`' + newParts.join(' ') + '`}'
});

fs.writeFileSync('frontend/src/components/agents/AgentDetail.tsx', content);
