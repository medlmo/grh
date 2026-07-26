import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Conges from './pages/Conges';
import Decisions from './pages/Decisions';
import Parametrage from './pages/Parametrage';
import Comptes from './pages/Comptes';
import Profil from './pages/Profil';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents/*" element={<Agents />} />
              <Route path="/conges/*" element={<Conges />} />
              <Route path="/decisions/*" element={<Decisions />} />
              <Route path="/parametrage/*" element={<Parametrage />} />
              <Route path="/comptes/*" element={<Comptes />} />
              <Route path="/profil" element={<Profil />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
