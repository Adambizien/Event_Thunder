import { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/Modal';
import UserTransactionsModal from '../../components/UserTransactionsModal';
import AdminPageHeader from '../../components/AdminPageHeader';
import type { User } from '../../types/AuthTypes';
import { userService } from '../../services/UserService';
import { subscriptionService } from '../../services/SubscriptionService';
import type { SubscriptionType } from '../../types/SubscriptionTypes';

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [activeSubscriptionsByUser, setActiveSubscriptionsByUser] = useState<
    Record<string, SubscriptionType | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'User' | 'Admin'>('User');
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionsUser, setTransactionsUser] = useState<User | null>(null);

  const openTransactionsModal = (user: User) => {
    setTransactionsUser(user);
    setShowTransactionsModal(true);
  };

  const closeTransactionsModal = () => {
    setShowTransactionsModal(false);
    setTransactionsUser(null);
  };
  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role === 'Admin' ? 'Admin' : 'User');
    setRoleError(null);
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setSelectedUser(null);
    setRoleError(null);
  };

  const handleRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setRoleLoading(true);
    setRoleError(null);
    try {
      await userService.updateUserRole(selectedUser.id, newRole);
      closeRoleModal();
      fetchUsers();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setRoleLoading(false);
    }
  };

  const fetchActiveSubscriptions = useCallback(async (userList: User[]) => {
    setSubsLoading(true);
    try {
      const results = await Promise.allSettled(
        userList.map(async (user) => {
          const subs = await subscriptionService.getUserSubscriptions(user.id);
          const normalized = Array.isArray(subs)
            ? (subs as SubscriptionType[])
            : [];
          const active =
            normalized.find((sub) => sub.status === 'active') ?? null;
          return [user.id, active] as const;
        }),
      );

      const next: Record<string, SubscriptionType | null> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const [userId, activeSub] = result.value;
          next[userId] = activeSub;
        }
      }
      setActiveSubscriptionsByUser(next);
    } finally {
      setSubsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.fetchUsers();
      setUsers(data);
      await fetchActiveSubscriptions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setUsers([]);
      setActiveSubscriptionsByUser({});
    } finally {
      setLoading(false);
    }
  }, [fetchActiveSubscriptions]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await userService.deleteUser(userId);
      setError(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };


  const filteredUsers = users.filter((user) => {
    const haystack = [user.firstName, user.lastName, user.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const searchWords = searchTerm
      .toLowerCase()
      .split(' ')
      .filter(Boolean);
    const matchesSearch = searchWords.every(word => haystack.includes(word));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const hasActiveSubscription = Boolean(activeSubscriptionsByUser[user.id]);
    const matchesPlan =
      filterPlan === 'all' ||
      (filterPlan === 'subscribed' && hasActiveSubscription) ||
      (filterPlan === 'unsubscribed' && !hasActiveSubscription);
    return matchesSearch && matchesRole && matchesPlan;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4 text-4xl">⚡</div>
          <p className="text-gray-400">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Liste des utilisateurs"
        subtitle="Gérez les utilisateurs de votre plateforme"
      />

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Email, prénom ou nom..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rôle
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="all">Tous les rôles</option>
              <option value="User">Utilisateur</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Abonnement
            </label>
            <select
              value={filterPlan}
              onChange={(e) =>
                setFilterPlan(e.target.value as 'all' | 'subscribed' | 'unsubscribed')
              }
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="all">Tous</option>
              <option value="subscribed">Abonnés</option>
              <option value="unsubscribed">Non abonnés</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total utilisateurs</p>
          <p className="text-2xl font-bold text-thunder-gold">{users.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Administrateurs</p>
          <p className="text-2xl font-bold text-purple-400">
            {users.filter((u) => u.role === 'Admin').length}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Utilisateurs actifs</p>
          <p className="text-2xl font-bold text-blue-400">
            {users.filter((u) => u.role === 'User' || !u.role).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {users.length === 0 ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur ne correspond à votre recherche'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Utilisateur
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Téléphone
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Rôle
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Plan
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-700 hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-thunder-gold/20 rounded-full flex items-center justify-center">
                          <span className="text-thunder-gold font-semibold">
                            {(user.firstName?.[0] || '').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sans nom'}
                          </p>
                          <p className="text-xs text-gray-500">{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">
                        {user.phoneNumber || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.role === 'Admin' && (
                          <span className="bg-purple-900/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium">
                            Admin
                          </span>
                        )}
                        {user.role === 'User' && (
                          <span className="bg-blue-900/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                            Utilisateur
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {subsLoading ? (
                          <span className="text-gray-500">Chargement...</span>
                        ) : activeSubscriptionsByUser[user.id] ? (
                          <div className="flex flex-col space-y-2">
                            <div className="inline-flex bg-green-900/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium self-start">
                              Abonné
                            </div>
                            <button
                              type="button"
                              onClick={() => openTransactionsModal(user)}
                              className="inline-flex items-center justify-center rounded border border-thunder-gold/40 px-3 py-1 text-xs font-semibold text-thunder-gold transition-colors hover:bg-thunder-gold hover:text-black self-start"
                            >
                              Voir les détails
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            <div className="inline-flex bg-red-900/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium self-start">
                              Non abonné
                            </div>
                            <button
                              type="button"
                              onClick={() => openTransactionsModal(user)}
                              className="inline-flex items-center justify-center rounded border border-thunder-gold/40 px-3 py-1 text-xs font-semibold text-thunder-gold transition-colors hover:bg-thunder-gold hover:text-black self-start"
                            >
                              Voir les détails
                            </button>
                          </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openRoleModal(user)}
                          className="px-2 py-1 bg-gray-800 hover:bg-thunder-gold/20 text-gray-400 hover:text-thunder-gold rounded text-xs border border-gray-700"
                          title="Modifier le rôle"
                        >
                          Modifier le rôle
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-red-900/20 rounded transition-colors text-red-400 hover:text-red-300 text-lg"
                          title="Supprimer l'utilisateur"
                        >
                          Supprimer le compte
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showRoleModal}
        onClose={closeRoleModal}
        title={
          selectedUser
            ? `Modifier le rôle de ${selectedUser.firstName || selectedUser.email}`
            : 'Modifier le rôle'
        }
        size="sm"
      >
        <form onSubmit={handleRoleChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rôle</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'User' | 'Admin')}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              disabled={roleLoading}
            >
              <option value="User">Utilisateur</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {roleError && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400 mb-2">
              {roleError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeRoleModal}
              className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
              disabled={roleLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-thunder-gold text-black font-semibold hover:bg-thunder-orange disabled:opacity-60"
              disabled={roleLoading}
            >
              {roleLoading ? 'Modification...' : 'Valider'}
            </button>
          </div>
        </form>
      </Modal>

      <UserTransactionsModal
        isOpen={showTransactionsModal}
        onClose={closeTransactionsModal}
        user={transactionsUser}
      />
    </div>
  );
};

export default AdminUsers;