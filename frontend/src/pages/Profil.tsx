import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profil: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div>
      <div className="page-header">
        <h1>Mon Profil</h1>
      </div>
      <div className="card">
        <div className="card-body">
          <p><strong>Nom :</strong> {user?.nomComplet}</p>
          <p><strong>Email :</strong> {user?.email}</p>
          <p><strong>Rôle :</strong> {user?.role}</p>
        </div>
      </div>
    </div>
  );
};

export default Profil;
