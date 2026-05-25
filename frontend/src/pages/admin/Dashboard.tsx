import { useState, useEffect } from 'react';
import { userService } from '../../services/UserService';
import { planService } from '../../services/PlanService';
import { eventService } from '../../services/EventService';
import { eventCategoryService } from '../../services/EventCategoryService';
import { subscriptionService } from '../../services/SubscriptionService';
import AdminPageHeader from '../../components/AdminPageHeader';

type TopCategory = {
  id: string;
  name: string;
  eventsCount: number;
};

interface Stats {
  totalUsers: number;
  totalPlans: number;
  totalCategories: number;
  activeSubscriptions: number;
  publishedEvents: number;
  draftEvents: number;
  completedEvents: number;
  canceledEvents: number;
  topCategories: TopCategory[];
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPlans: 0,
    totalCategories: 0,
    activeSubscriptions: 0,
    publishedEvents: 0,
    draftEvents: 0,
    completedEvents: 0,
    canceledEvents: 0,
    topCategories: [],
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

      const [users, plans, events, categories, subscriptions] = await Promise.all([
        userService.fetchUsers(),
        planService.fetchPlans(),
        eventService.fetchEvents(),
        eventCategoryService.fetchCategories(),
        subscriptionService.getAdminSubscriptionsOverview(),
      ]);

      const categoryUsage = events.reduce<Record<string, number>>((usage, event) => {
        usage[event.category_id] = (usage[event.category_id] ?? 0) + 1;
        return usage;
      }, {});
      const topCategories = Object.entries(categoryUsage)
        .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
        .slice(0, 3)
        .map(([categoryId, eventsCount]) => {
          const category = categories.find((item) => item.id === categoryId);
          const eventCategory = events.find((event) => event.category_id === categoryId)
            ?.category;

          return {
            id: categoryId,
            name: category?.name ?? eventCategory?.name ?? 'Catégorie inconnue',
            eventsCount,
          };
        });

      setStats({
        totalUsers: users.length,
        totalPlans: plans.length,
        totalCategories: categories.length,
        activeSubscriptions: subscriptions.filter(
          (subscription) => subscription.status === 'active',
        ).length,
        publishedEvents: events.filter((event) => event.status === 'published').length,
        draftEvents: events.filter((event) => event.status === 'draft').length,
        completedEvents: events.filter((event) => event.status === 'completed').length,
        canceledEvents: events.filter((event) => event.status === 'canceled').length,
        topCategories,
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
      <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
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

      {/* General Stats */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Statistiques générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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

          {/* Total Categories */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Catégories</p>
                <p className="text-3xl font-bold text-white">{stats.totalCategories}</p>
              </div>
              <span className="text-2xl font-semibold text-thunder-gold">Cat.</span>
            </div>
          </div>
        </div>
      </div>
      {/* Categories Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Catégories</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Top 3 catégories</p>
                <p className="text-xl font-semibold text-white">Les plus utilisées</p>
              </div>
              <span className="text-2xl font-semibold text-thunder-gold">Top 3</span>
            </div>

            {stats.topCategories.length > 0 ? (
              <div className="space-y-3">
                {stats.topCategories.map((category, index) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-thunder-gold text-sm font-bold text-black">
                        {index + 1}
                      </span>
                      <p className="font-semibold text-white">{category.name}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-300">
                      {category.eventsCount} événement
                      {category.eventsCount > 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-300">Aucune catégorie utilisée pour le moment.</p>
            )}
          </div>
        </div>
      </div>
      {/* Events Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Événements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Publiés</p>
                <p className="text-3xl font-bold text-white">{stats.publishedEvents}</p>
              </div>
              <span className="text-2xl font-semibold text-thunder-gold">Pub.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Brouillons</p>
                <p className="text-3xl font-bold text-white">{stats.draftEvents}</p>
              </div>
              <span className="text-2xl font-semibold text-thunder-gold">Draft</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Terminés</p>
                <p className="text-3xl font-bold text-white">{stats.completedEvents}</p>
              </div>
              <span className="text-2xl font-semibold text-thunder-gold">Done</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Annulés</p>
                <p className="text-3xl font-bold text-white">{stats.canceledEvents}</p>
              </div>
              <span className="text-2xl font-semibold text-thunder-gold">Stop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;