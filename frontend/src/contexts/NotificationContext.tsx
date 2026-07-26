import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const VALIDATOR_ROLES = ['CHEF_SERVICE', 'CHEF_DIVISION', 'DRH', 'DIRECTEUR_GENERAL', 'PRESIDENT'];

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    if (!user || !VALIDATOR_ROLES.includes(user.role)) {
      setPendingCount(0);
      return;
    }
    try {
      const response = await api.get('/conges/a-valider/count');
      setPendingCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching pending conges count:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return (
    <NotificationContext.Provider value={{ pendingCount, refreshPendingCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
