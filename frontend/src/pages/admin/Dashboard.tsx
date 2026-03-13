import { useState, useEffect } from 'react';
import { userService } from '../../services/UserService';
import { planService } from '../../services/PlanService';
import AdminPageHeader from '../../components/AdminPageHeader';

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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
        <span className="spinner mr-2 align-middle"></span>
        Chargement des statistiques...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Tableau de bord"
        subtitle="Bienvenue dans l'interface d'administration"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm mb-1">Total Utilisateurs</p>
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <span className="text-2xl font-semibold text-thunder-gold">Users</span>
          </div>
        </div>

        {/* Total Plans */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm mb-1">Plans de Service</p>
              <p className="text-3xl font-bold text-white">{stats.totalPlans}</p>
            </div>
            <span className="text-2xl font-semibold text-thunder-gold">Plans</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm mb-1">Abonnements Actifs</p>
              <p className="text-3xl font-bold text-white">{stats.activeSubscriptions}</p>
            </div>
            <span className="text-2xl font-semibold text-thunder-gold">Active</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <h2 className="text-xl font-bold text-white mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="bg-thunder-gold hover:bg-thunder-orange text-black font-semibold py-3 rounded-lg transition-colors">
            Créer un plan
          </button>
          <button className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 rounded-lg transition-colors">
            Voir les utilisateurs
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;