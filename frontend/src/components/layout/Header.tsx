import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleMobile: () => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarCollapsed, onToggleMobile }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className={`${styles.header} ${sidebarCollapsed ? styles['sidebar-collapsed'] : ''}`}>
      <div className={styles.headerLeft}>
        <button className="lg:hidden p-2 -ml-2 text-gray-500" onClick={onToggleMobile}>
          <Menu size={24} />
        </button>
        {/* Placeholder for dynamic page title/breadcrumb if needed */}
      </div>

      <div className={styles.headerRight}>
        {/* Language Switcher */}
        <div className={styles.langSwitch}>
          <button
            className={`${styles.langBtn} ${i18n.language === 'fr' ? styles.langBtnActive : ''}`}
            onClick={() => changeLanguage('fr')}
          >
            FR
          </button>
          <button
            className={`${styles.langBtn} ${i18n.language === 'ar' ? styles.langBtnActive : ''}`}
            onClick={() => changeLanguage('ar')}
          >
            AR
          </button>
        </div>

        {/* Notifications */}
        <button className="p-2 text-gray-500 hover:text-gray-700 relative">
          <Bell size={20} />
        </button>

        {/* User Menu */}
        <div className="dropdown" ref={dropdownRef}>
          <div className="user-menu" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="user-info hidden sm:flex text-right mr-2">
              <span className="user-name">{user?.nomComplet}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <div className="user-avatar">
              {user?.nomComplet.charAt(0).toUpperCase()}
            </div>
          </div>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="px-4 py-2 border-b sm:hidden">
                <div className="font-semibold text-sm">{user?.nomComplet}</div>
                <div className="text-xs text-gray-500">{user?.role}</div>
              </div>
              
              <button 
                className="dropdown-item mt-1"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/profil');
                }}
              >
                <User />
                {t('common.profile')}
              </button>
              
              <div className="dropdown-divider"></div>
              
              <button 
                className="dropdown-item danger"
                onClick={handleLogout}
              >
                <LogOut />
                {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
