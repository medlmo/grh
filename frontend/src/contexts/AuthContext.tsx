import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

interface User {
  id: number;
  email: string;
  role: string;
  agentId: number | null;
  nomComplet: string;
}

interface LoginCredentials {
  email: string;
  motDePasse: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser({
          id: response.data.id,
          email: response.data.email,
          role: response.data.role,
          agentId: response.data.agentId,
          nomComplet: response.data.agent ? `${response.data.agent.prenomFr} ${response.data.agent.nomFr}` : response.data.email,
        });
      } catch (error) {
        setUser(null);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials);
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error(error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
