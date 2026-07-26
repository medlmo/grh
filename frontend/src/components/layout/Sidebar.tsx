import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  FileSignature, 
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCog
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, mobileOpen, onToggle, onCloseMobile }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { pendingCount } = useNotifications();
  
  const isRtl = i18n.language === 'ar';
  
  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/agents', label: t('nav.agents'), icon: Users, roles: ['ADMIN', 'DRH', 'DIRECTEUR_GENERAL'] },
    { path: '/conges', label: t('nav.conges'), icon: CalendarDays, badge: pendingCount },
    { path: '/decisions', label: t('nav.decisions'), icon: FileSignature, roles: ['ADMIN', 'DRH', 'DIRECTEUR_GENERAL', 'PRESIDENT'] },
    { path: '/comptes', label: t('nav.comptes', 'Comptes'), icon: UserCog, roles: ['ADMIN'] },
    { path: '/parametrage', label: t('nav.parametrage'), icon: Settings, roles: ['ADMIN'] },
  ];

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarLogo}>
          <ShieldCheck size={24} />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className={styles.sidebarTitle}>Région Souss-Massa</span>
            <span className={styles.sidebarSubtitle}>Système GRH</span>
          </div>
        )}
      </div>

      <nav className={styles.sidebarNav}>
        {!collapsed && <div className={styles.sidebarSectionTitle}>Menu Principal</div>}
        
        {navItems.map((item) => {
          if (item.roles && user && !item.roles.includes(user.role)) return null;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `${styles.sidebarLink} ${isActive ? styles.active : ''}`}
              title={collapsed ? item.label : ''}
              onClick={onCloseMobile}
            >
              <item.icon />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge ? (
                <span className={styles.sidebarBadge}>{item.badge > 99 ? '99+' : item.badge}</span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className={`${styles.sidebarFooter} hidden lg:block`}>
        <button onClick={onToggle} className={styles.sidebarToggle} title="Réduire/Agrandir">
          {collapsed ? (
            isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />
          ) : (
            isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
