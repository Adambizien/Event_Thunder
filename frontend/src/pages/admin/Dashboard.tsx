import { useState, useEffect } from 'react';
import { userService } from '../../services/UserService';
import { planService } from '../../services/PlanService';

interface Stats {
  totalUsers: number;
  totalPlans: number;
  activeSubscriptions: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPlans: 0,
    activeSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [users, plans] = await Promise.all([
        userService.fetchUsers(),
        planService.fetchPlans(),
      ]);

      setStats({
        totalUsers: users.length,
        totalPlans: plans.length,
        activeSubscriptions: users.filter((user) => Boolean(user.planId)).length,
      });
    } catch {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4">⚡</div>
          <p className="text-gray-400">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Tableau de bord</h1>
        <p className="text-gray-400">Bienvenue dans l'interface d'administration</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-thunder-gold transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Utilisateurs</p>
              <p className="text-3xl font-bold text-thunder-gold">{stats.totalUsers}</p>
            </div>
            <span className="text-5xl opacity-50">👥</span>
          </div>
        </div>

        {/* Total Plans */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-thunder-gold transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Plans de Service</p>
              <p className="text-3xl font-bold text-thunder-gold">{stats.totalPlans}</p>
            </div>
            <span className="text-5xl opacity-50">🛒</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-thunder-gold transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Abonnements Actifs</p>
              <p className="text-3xl font-bold text-thunder-gold">{stats.activeSubscriptions}</p>
            </div>
            <span className="text-5xl opacity-50">📊</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="bg-thunder-gold hover:bg-thunder-orange text-black font-semibold py-3 rounded-lg transition-all transform hover:scale-105">
            ➕ Créer un plan
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105">
            👁️ Voir les utilisateurs
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
