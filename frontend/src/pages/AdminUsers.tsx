import { useState, useEffect } from 'react';
import type { User } from '../types/AuthTypes';

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des utilisateurs');
      
      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');
      
      setError(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesRole;
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
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Liste des utilisateurs</h1>
        <p className="text-gray-400">Gérez les utilisateurs de votre plateforme</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="user">Utilisateur</option>
              <option value="admin">Admin</option>
            </select>
          </div>
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
                            🔑 Admin
                          </span>
                        )}
                        {!user.role || user.role === 'User' && (
                          <span className="bg-blue-900/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                            Utilisateur
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {user.planId ? (
                        <span className="bg-gray-800 px-3 py-1 rounded text-sm">
                          {user.planId}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 hover:bg-red-900/20 rounded transition-colors text-red-400 hover:text-red-300 text-lg"
                        title="Supprimer l'utilisateur"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total utilisateurs</p>
          <p className="text-2xl font-bold text-thunder-gold">{users.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">🔑 Administrateurs</p>
          <p className="text-2xl font-bold text-purple-400">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Utilisateurs actifs</p>
          <p className="text-2xl font-bold text-blue-400">
            {users.filter((u) => u.role === 'user' || !u.role).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
