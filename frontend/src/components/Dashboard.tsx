import { useNavigate } from 'react-router-dom';
import { authService } from '../services/AuthServices';
import type { User } from '../types/AuthTypes';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-6xl mb-4">🎉</h1>
          <h2 className="text-4xl font-black text-thunder-yellow mb-3">
            Bienvenue sur votre Tableau de Bord!
          </h2>
          <p className="text-xl text-gray-300">Vous êtes maintenant connecté</p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Profile Card */}
          <div className="lg:col-span-2 card p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-3 border-b-2 border-thunder-gold">
              Informations de Profil
            </h3>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">Email</span>
                <span className="text-gray-600 font-mono">{user.email}</span>
              </div>

              {/* Full Name */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">Nom Complet</span>
                <span className="text-gray-600">{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</span>
              </div>

              {/* User ID */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">ID Utilisateur</span>
                <span className="text-gray-600 text-sm font-mono">{user.id.slice(0, 12)}...</span>
              </div>

              {/* Phone Number */}
              {user.phoneNumber && (
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-semibold text-gray-700">Téléphone</span>
                  <span className="text-gray-600">{user.phoneNumber}</span>
                </div>
              )}

              {/* Role */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">Rôle</span>
                <span className="text-gray-600">{user.role || ''}</span>
              </div>

              {/* Plan */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">Plan</span>
                <span className="text-gray-600">{user.planId || ''}</span>
              </div>

              
            </div>
          </div>

          {/* Avatar Card */}
          <div className="card p-8 flex flex-col items-center justify-center text-center">
            <>
              <div className="w-24 h-24 rounded-full bg-thunder-gold flex items-center justify-center mb-4">
                <span className="text-4xl">👤</span>
              </div>
              <p className="text-sm text-gray-600">Profil</p>
            </>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 text-center">
            <p className="text-4xl font-bold text-thunder-gold mb-2">⚡</p>
            <p className="font-semibold text-gray-800">Rapide</p>
            <p className="text-sm text-gray-600">Accès instantané</p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-4xl font-bold text-thunder-yellow mb-2">🔒</p>
            <p className="font-semibold text-gray-800">Sécurisé</p>
            <p className="text-sm text-gray-600">Vos données protégées</p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-4xl font-bold text-thunder-orange mb-2">✓</p>
            <p className="font-semibold text-gray-800">Vérifié</p>
            <p className="text-sm text-gray-600">Compte confirmé</p>
          </div>
        </div>

        {/* Action Section */}
        <div className="text-center">
          <button 
            onClick={handleLogout}
            className="btn-primary inline-flex items-center gap-2 px-8"
            >
              🚪 Se déconnecter
            </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;