import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

// Pages are loaded on demand so the initial bundle only contains the shell
// and the route needed by the current visitor.
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Agents = React.lazy(() => import('./pages/Agents'));
const Conges = React.lazy(() => import('./pages/Conges'));
const Decisions = React.lazy(() => import('./pages/Decisions'));
const Parametrage = React.lazy(() => import('./pages/Parametrage'));
const Comptes = React.lazy(() => import('./pages/Comptes'));
const Profil = React.lazy(() => import('./pages/Profil'));

const PageLoading: React.FC = () => (
  <div className="flex h-full min-h-64 items-center justify-center" role="status" aria-label="Chargement">
    <div className="spinner" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Suspense fallback={<PageLoading />}>
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
        </Suspense>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
