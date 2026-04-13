import { useState, useEffect, useCallback } from 'react';
import UserRoleModal from '../../components/UserRoleModal';
import UserSubscriptionDetailsModal from '../../components/UserSubscriptionDetailsModal';
import UniformTable from '../../components/UniformTable';
import AdminPageHeader from '../../components/AdminPageHeader';
import FloatingActionsMenu from '../../components/FloatingActionsMenu';
import type { User } from '../../types/AuthTypes';
import { userService } from '../../services/UserService';
import { subscriptionService } from '../../services/SubscriptionService';
import type { SubscriptionType } from '../../types/SubscriptionTypes';

type UserSubscriptionStatus = 'subscribed' | 'canceling' | 'unsubscribed';

const hasAccessUntil = (value: string | null) => {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp) && timestamp > Date.now();
};

const getUserSubscriptionStatus = (
  subscriptions: SubscriptionType[],
): UserSubscriptionStatus => {
  const hasActive = subscriptions.some((sub) => sub.status === 'active');
  if (hasActive) {
    return 'subscribed';
  }

  const hasCanceling = subscriptions.some(
    (sub) => sub.status === 'canceled' && hasAccessUntil(sub.currentPeriodEnd),
  );
  if (hasCanceling) {
    return 'canceling';
  }

  return 'unsubscribed';
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptionStatusByUser, setSubscriptionStatusByUser] = useState<
    Record<string, UserSubscriptionStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<
    'all' | 'subscribed' | 'canceling' | 'unsubscribed'
  >('all');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'User' | 'Admin'>('User');
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionsUser, setTransactionsUser] = useState<User | null>(null);
  const [transactionsSubscriptions, setTransactionsSubscriptions] = useState<SubscriptionType[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);
  const [cancelingSubscriptionId, setCancelingSubscriptionId] = useState<string | null>(null);
  const [resumingSubscriptionId, setResumingSubscriptionId] = useState<string | null>(null);
  const [transactionsActionMessage, setTransactionsActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const openTransactionsModal = (user: User) => {
    setTransactionsUser(user);
    setTransactionsError(null);
    setTransactionsActionMessage(null);
    setShowTransactionsModal(true);
  };

  const closeTransactionsModal = () => {
    setShowTransactionsModal(false);
    setTransactionsUser(null);
    setTransactionsSubscriptions([]);
    setTransactionsError(null);
    setTransactionsActionMessage(null);
    setOpeningInvoiceId(null);
    setCancelingSubscriptionId(null);
    setResumingSubscriptionId(null);
  };

  useEffect(() => {
    if (!showTransactionsModal || !transactionsUser?.id) {
      return;
    }

    const fetchSubscriptions = async () => {
      try {
        setTransactionsLoading(true);
        setTransactionsError(null);
        const data = await subscriptionService.getUserSubscriptions(transactionsUser.id);
        setTransactionsSubscriptions(Array.isArray(data) ? data : []);
      } catch {
        setTransactionsError("Impossible de charger les transactions de l'utilisateur.");
        setTransactionsSubscriptions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    void fetchSubscriptions();
  }, [showTransactionsModal, transactionsUser?.id]);

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

  const fetchSubscriptionStatuses = useCallback(async (userList: User[]) => {
    setSubsLoading(true);
    try {
      const results = await Promise.allSettled(
        userList.map(async (user) => {
          const subs = await subscriptionService.getUserSubscriptions(user.id);
          const normalized = Array.isArray(subs)
            ? (subs as SubscriptionType[])
            : [];
          const status = getUserSubscriptionStatus(normalized);
          return [user.id, status] as const;
        }),
      );

      const next: Record<string, UserSubscriptionStatus> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const [userId, status] = result.value;
          next[userId] = status;
        }
      }
      setSubscriptionStatusByUser(next);
    } finally {
      setSubsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.fetchUsers();
      setUsers(data);
      await fetchSubscriptionStatuses(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setUsers([]);
      setSubscriptionStatusByUser({});
    } finally {
      setLoading(false);
    }
  }, [fetchSubscriptionStatuses]);

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

  const handleOpenInvoice = async (stripeInvoiceId: string) => {
    if (!stripeInvoiceId) {
      setTransactionsError('Facture Stripe indisponible pour cette transaction.');
      return;
    }

    try {
      setOpeningInvoiceId(stripeInvoiceId);
      setTransactionsError(null);
      const { hostedInvoiceUrl, invoicePdfUrl } =
        await subscriptionService.getInvoiceLinks(stripeInvoiceId, transactionsUser?.id);
      const invoiceUrl = hostedInvoiceUrl ?? invoicePdfUrl;

      if (!invoiceUrl) {
        setTransactionsError('Facture Stripe indisponible pour cette transaction.');
        return;
      }

      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setTransactionsError('Impossible d’ouvrir la facture Stripe.');
    } finally {
      setOpeningInvoiceId(null);
    }
  };

  const handleCancelSubscription = async (stripeSubscriptionId: string) => {
    if (!transactionsUser?.id) {
      setTransactionsError('Utilisateur invalide.');
      return;
    }

    const confirmed = window.confirm('Voulez-vous vraiment annuler cet abonnement ?');
    if (!confirmed) {
      return;
    }

    try {
      setCancelingSubscriptionId(stripeSubscriptionId);
      setTransactionsError(null);
      setTransactionsActionMessage(null);

      await subscriptionService.cancelSubscription({
        userId: transactionsUser.id,
        stripeSubscriptionId,
      });

      try {
        const data = await subscriptionService.getUserSubscriptions(transactionsUser.id);
        setTransactionsSubscriptions(Array.isArray(data) ? data : []);
      } catch {
        const nowIso = new Date().toISOString();
        setTransactionsSubscriptions((prev) =>
          prev.map((subscription) =>
            subscription.stripeSubscriptionId === stripeSubscriptionId
              ? {
                  ...subscription,
                  status: 'canceled',
                  canceledAt: nowIso,
                  endedAt: subscription.currentPeriodEnd ?? subscription.endedAt,
                }
              : subscription,
          ),
        );
      }

      setTransactionsActionMessage({
        type: 'success',
        text: "L'abonnement a bien été annulé.",
      });
    } catch {
      setTransactionsError("Erreur lors de l'annulation de l'abonnement.");
      setTransactionsActionMessage({
        type: 'error',
        text: "L'annulation de l'abonnement a échoué.",
      });
    } finally {
      setCancelingSubscriptionId(null);
    }
  };

  const handleResumeSubscription = async (stripeSubscriptionId: string) => {
    if (!transactionsUser?.id) {
      setTransactionsError('Utilisateur invalide.');
      return;
    }

    try {
      setResumingSubscriptionId(stripeSubscriptionId);
      setTransactionsError(null);
      setTransactionsActionMessage(null);

      await subscriptionService.resumeSubscription({
        userId: transactionsUser.id,
        stripeSubscriptionId,
      });

      try {
        const data = await subscriptionService.getUserSubscriptions(transactionsUser.id);
        setTransactionsSubscriptions(Array.isArray(data) ? data : []);
      } catch {
        setTransactionsSubscriptions((prev) =>
          prev.map((subscription) =>
            subscription.stripeSubscriptionId === stripeSubscriptionId
              ? {
                  ...subscription,
                  status: 'active',
                  canceledAt: null,
                  endedAt: null,
                }
              : subscription,
          ),
        );
      }

      setTransactionsActionMessage({
        type: 'success',
        text: "L'annulation a bien été retirée.",
      });
    } catch {
      setTransactionsError("Erreur lors de l'annulation de l'annulation.");
      setTransactionsActionMessage({
        type: 'error',
        text: "Impossible de retirer l'annulation de l'abonnement.",
      });
    } finally {
      setResumingSubscriptionId(null);
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
    const userSubscriptionStatus = subscriptionStatusByUser[user.id] ?? 'unsubscribed';
    const matchesPlan =
      filterPlan === 'all' ||
      (filterPlan === 'subscribed' && userSubscriptionStatus === 'subscribed') ||
      (filterPlan === 'canceling' && userSubscriptionStatus === 'canceling') ||
      (filterPlan === 'unsubscribed' && userSubscriptionStatus === 'unsubscribed');
    return matchesSearch && matchesRole && matchesPlan;
  });

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
        <span className="spinner mr-2 align-middle"></span>
        Chargement des utilisateurs...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Liste des utilisateurs"
        subtitle="Gérez les utilisateurs de votre plateforme"
      />

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
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
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rôle
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
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
                setFilterPlan(
                  e.target.value as
                    | 'all'
                    | 'subscribed'
                    | 'canceling'
                    | 'unsubscribed',
                )
              }
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="all">Tous</option>
              <option value="subscribed">Abonnés</option>
              <option value="canceling">En cours de désabonnement</option>
              <option value="unsubscribed">Non abonnés</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-lg">
          <p className="text-gray-300 text-sm mb-1">Total utilisateurs</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-lg">
          <p className="text-gray-300 text-sm mb-1">Administrateurs</p>
          <p className="text-2xl font-bold text-white">
            {users.filter((u) => u.role === 'Admin').length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-lg">
          <p className="text-gray-300 text-sm mb-1">Utilisateurs actifs</p>
          <p className="text-2xl font-bold text-white">
            {users.filter((u) => u.role === 'User' || !u.role).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl backdrop-blur-lg">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {users.length === 0 ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur ne correspond à votre recherche'}
            </p>
          </div>
        ) : (
          <UniformTable
            headers={['Utilisateur', 'Email', 'Téléphone', 'Rôle', 'Plan', 'Actions']}
            tableClassName="min-w-[900px] w-full"
            headerCellClassName="px-4 py-3 text-left text-xs font-semibold text-gray-300 sm:px-6 sm:py-4 sm:text-sm"
          >
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/10 hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3 sm:px-6 sm:py-4">
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
                      <p className="text-xs text-gray-400">{user.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 sm:px-6 sm:py-4">
                  <div className="text-gray-300">
                    {user.email}
                  </div>
                </td>
                <td className="px-4 py-3 sm:px-6 sm:py-4">
                  <div className="text-gray-300">
                    {user.phoneNumber || '-'}
                  </div>
                </td>
                <td className="px-4 py-3 sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2">
                    {user.role === 'Admin' && (
                      <span className="bg-white/10 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Admin
                      </span>
                    )}
                    {user.role === 'User' && (
                      <span className="bg-white/10 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Utilisateur
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-300">
                  {subsLoading ? (
                      <span className="text-gray-500">Chargement...</span>
                    ) : (subscriptionStatusByUser[user.id] ?? 'unsubscribed') === 'subscribed' ? (
                      <div className="flex flex-col space-y-2">
                        <div className="inline-flex bg-green-900/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium self-start">
                          Abonné
                        </div>
                      </div>
                    ) : (subscriptionStatusByUser[user.id] ?? 'unsubscribed') === 'canceling' ? (
                      <div className="flex flex-col space-y-2">
                        <div className="inline-flex bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-sm font-medium self-start border border-amber-500/40">
                          En cours de désabonnement
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        <div className="inline-flex bg-red-500/30 text-red-300 px-3 py-1 rounded-full text-sm font-medium self-start border border-red-500/50">
                          Non abonné
                        </div>
                      </div>
                  )}
                </td>
                <td className="px-4 py-3 sm:px-6 sm:py-4">
                  <FloatingActionsMenu
                    items={[
                      {
                        key: 'details',
                        label: 'Détails de l’abonnement',
                        onClick: () => openTransactionsModal(user),
                      },
                      {
                        key: 'edit-role',
                        label: 'Modifier le rôle',
                        onClick: () => openRoleModal(user),
                      },
                      {
                        key: 'delete-user',
                        label: 'Supprimer le compte',
                        onClick: () => {
                          void handleDelete(user.id);
                        },
                        destructive: true,
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </UniformTable>
        )}
      </div>

      <UserRoleModal
        isOpen={showRoleModal}
        selectedUser={selectedUser}
        newRole={newRole}
        roleLoading={roleLoading}
        roleError={roleError}
        onClose={closeRoleModal}
        onSubmit={handleRoleChange}
        onRoleChange={setNewRole}
      />

      <UserSubscriptionDetailsModal
        isOpen={showTransactionsModal}
        user={transactionsUser}
        subscriptions={transactionsSubscriptions}
        loading={transactionsLoading}
        error={transactionsError}
        actionMessage={transactionsActionMessage}
        openingInvoiceId={openingInvoiceId}
        cancelingSubscriptionId={cancelingSubscriptionId}
        resumingSubscriptionId={resumingSubscriptionId}
        onClose={closeTransactionsModal}
        onOpenInvoice={(stripeInvoiceId) => {
          void handleOpenInvoice(stripeInvoiceId);
        }}
        onCancelSubscription={(stripeSubscriptionId) => {
          void handleCancelSubscription(stripeSubscriptionId);
        }}
        onResumeSubscription={(stripeSubscriptionId) => {
          void handleResumeSubscription(stripeSubscriptionId);
        }}
      />
    </div>
  );
};

export default AdminUsers;