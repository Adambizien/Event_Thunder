import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { subscriptionService } from '../services/SubscriptionService';
import type { SubscriptionType } from '../types/SubscriptionTypes';
import type { User } from '../types/AuthTypes';

interface UserTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
  }).format(amount);
};

const getRemainingLabel = (endDate: string | null) => {
  if (!endDate) {
    return 'Durée non disponible';
  }

  const diffMs = new Date(endDate).getTime() - Date.now();
  if (diffMs <= 0) {
    return 'Terminé';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} j ${hours} h restants`;
  }

  if (hours > 0) {
    return `${hours} h ${minutes} min restantes`;
  }

  return `${minutes} min restantes`;
};

const hasAccessUntilEnd = (endDate: string | null) => {
  if (!endDate) {
    return false;
  }

  return new Date(endDate).getTime() > Date.now();
};

const getIntervalLabel = (interval: string) => {
  switch (interval) {
    case 'monthly':
      return 'Mensuel';
    case 'yearly':
      return 'Annuel';
    default:
      return interval;
  }
};

const UserTransactionsModal = ({ isOpen, onClose, user }: UserTransactionsModalProps) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);
  const [cancelingSubscriptionId, setCancelingSubscriptionId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !user?.id) {
      return;
    }

    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await subscriptionService.getUserSubscriptions(user.id);
        setSubscriptions(Array.isArray(data) ? data : []);
      } catch {
        setError("Impossible de charger les transactions de l'utilisateur.");
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchSubscriptions();
  }, [isOpen, user?.id]);

  const payments = useMemo(() => {
    return subscriptions
      .flatMap((subscription) =>
        (subscription.payments ?? []).map((payment) => ({
          ...payment,
          subscription,
        })),
      )
      .sort((a, b) => {
        const left = new Date(a.paidAt ?? a.createdAt).getTime();
        const right = new Date(b.paidAt ?? b.createdAt).getTime();
        return right - left;
      });
  }, [subscriptions]);

  const activeSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.status === 'active') ?? null,
    [subscriptions],
  );

  const canceledSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.status === 'canceled'),
    [subscriptions],
  );

  const handleOpenInvoice = async (stripeInvoiceId: string) => {
    if (!stripeInvoiceId) {
      setError('Facture Stripe indisponible pour cette transaction.');
      return;
    }

    try {
      setOpeningInvoiceId(stripeInvoiceId);
      setError(null);
      const { hostedInvoiceUrl, invoicePdfUrl } =
        await subscriptionService.getInvoiceLinks(stripeInvoiceId, user?.id);
      const invoiceUrl = hostedInvoiceUrl ?? invoicePdfUrl;

      if (!invoiceUrl) {
        setError('Facture Stripe indisponible pour cette transaction.');
        return;
      }

      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Impossible d’ouvrir la facture Stripe.');
    } finally {
      setOpeningInvoiceId(null);
    }
  };

  const handleCancelSubscription = async (stripeSubscriptionId: string) => {
    if (!user?.id) {
      setError('Utilisateur invalide.');
      return;
    }

    const confirmed = window.confirm(
      'Voulez-vous vraiment annuler cet abonnement ?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancelingSubscriptionId(stripeSubscriptionId);
      setError(null);
      setActionMessage(null);

      await subscriptionService.cancelSubscription({
        userId: user.id,
        stripeSubscriptionId,
      });

      try {
        const data = await subscriptionService.getUserSubscriptions(user.id);
        setSubscriptions(Array.isArray(data) ? data : []);
      } catch {
        const nowIso = new Date().toISOString();
        setSubscriptions((prev) =>
          prev.map((subscription) =>
            subscription.stripeSubscriptionId === stripeSubscriptionId
              ? {
                  ...subscription,
                  status: 'canceled',
                  canceledAt: nowIso,
                  endedAt: nowIso,
                }
              : subscription,
          ),
        );
      }

      setActionMessage({
        type: 'success',
        text: "L'abonnement a bien été annulé.",
      });
    } catch {
      setError("Erreur lors de l'annulation de l'abonnement.");
      setActionMessage({
        type: 'error',
        text: "L'annulation de l'abonnement a échoué.",
      });
    } finally {
      setCancelingSubscriptionId(null);
    }
  };

  const title = user
    ? `Transactions de ${user.firstName || user.email}`
    : 'Transactions utilisateur';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {loading ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-gray-300">
          Chargement des transactions...
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-700/60 bg-red-900/20 p-4 text-red-300">
              {error}
            </div>
          )}

          {actionMessage && (
            <div
              className={`rounded-lg border p-4 ${
                actionMessage.type === 'success'
                  ? 'border-green-500/50 bg-green-500/25 text-green-300'
                  : 'border-red-500/50 bg-red-500/30 text-red-300'
              }`}
            >
              {actionMessage.text}
            </div>
          )}

          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Abonnement actuel</h3>
              {activeSubscription ? (
                <span className="rounded-full bg-green-500/25 px-3 py-1 text-xs font-semibold text-green-300">
                  Actif
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-300">
                  Aucun abonnement actif
                </span>
              )}
            </div>

            {activeSubscription ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-thunder-gold/20 bg-thunder-gold/10 p-4">
                    <p className="text-sm text-gray-300">Plan</p>
                    <p className="mt-1 text-lg font-bold text-white">{activeSubscription.plan.name}</p>
                    <p className="text-sm text-thunder-gold">
                      {getIntervalLabel(activeSubscription.plan.interval)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-300">Tarif</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {formatCurrency(activeSubscription.plan.price, activeSubscription.plan.currency)}
                    </p>
                    <p className="text-sm text-gray-400">par période</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-300">Début de période</p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {formatDate(activeSubscription.currentPeriodStart)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Stripe ID: {activeSubscription.stripeSubscriptionId}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-300">Fin de période</p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {formatDate(activeSubscription.currentPeriodEnd)}
                    </p>
                    <p className="text-sm text-thunder-gold">
                      {getRemainingLabel(activeSubscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-red-500/30 bg-red-500/25 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-white">Annuler cet abonnement</p>
                    <p className="text-sm text-gray-300">
                      Vous garderez l’accès jusqu’à la fin de la période en cours.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCancelSubscription(activeSubscription.stripeSubscriptionId)}
                    disabled={cancelingSubscriptionId === activeSubscription.stripeSubscriptionId}
                    className="inline-flex items-center justify-center rounded-lg border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelingSubscriptionId === activeSubscription.stripeSubscriptionId
                      ? 'Annulation...'
                      : 'Annuler l’abonnement'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-gray-300">
                Aucun abonnement actif pour cet utilisateur.
              </div>
            )}
          </section>

          {payments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
              Aucune transaction disponible pour cet utilisateur.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-white/5 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Montant</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                      <th className="px-4 py-3 font-semibold">Facture Stripe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-white">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="bg-transparent">
                        <td className="px-4 py-3 text-gray-300">
                          {formatDate(payment.paidAt ?? payment.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{payment.subscription.plan.name}</div>
                          <div className="text-xs text-gray-400">
                            {payment.subscription.status === 'active'
                              ? 'Abonnement actif'
                              : 'Abonnement annulé'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-thunder-gold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              payment.status === 'paid'
                                ? 'bg-green-500/25 text-green-300'
                                : 'bg-red-500/25 text-red-300'
                            }`}
                          >
                            {payment.status === 'paid' ? 'Payé' : 'Échec'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleOpenInvoice(payment.stripeInvoiceId)}
                            disabled={openingInvoiceId === payment.stripeInvoiceId || !payment.stripeInvoiceId}
                            className="rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {openingInvoiceId === payment.stripeInvoiceId
                              ? 'Ouverture...'
                              : 'Voir la facture'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-lg font-semibold text-white">Abonnements annulés</h3>
            {canceledSubscriptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-gray-300">
                Aucun abonnement annulé pour le moment.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {canceledSubscriptions.map((subscription) => (
                  <article
                    key={subscription.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-white">{subscription.plan.name}</h4>
                        <p className="text-sm text-gray-400">
                          {formatCurrency(subscription.plan.price, subscription.plan.currency)} •{' '}
                          {getIntervalLabel(subscription.plan.interval)}
                        </p>
                      </div>
                      <span className="rounded-full bg-red-500/25 px-3 py-1 text-xs font-semibold text-red-300">
                        Annulé
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-300">
                      <p>
                        <span className="text-gray-400">Début :</span>{' '}
                        {formatDate(subscription.currentPeriodStart)}
                      </p>
                      <p>
                        <span className="text-gray-400">Fin :</span>{' '}
                        {formatDate(subscription.endedAt ?? subscription.currentPeriodEnd)}
                      </p>
                      <p>
                        <span className="text-gray-400">Date d’annulation :</span>{' '}
                        {formatDate(subscription.canceledAt)}
                      </p>
                      <p>
                        <span className="text-gray-400">Stripe ID :</span>{' '}
                        {subscription.stripeSubscriptionId}
                      </p>
                    </div>

                    {hasAccessUntilEnd(subscription.currentPeriodEnd) && (
                      <div className="mt-4 rounded-lg border border-thunder-gold/30 bg-thunder-gold/10 p-3 text-sm text-thunder-gold">
                        Cet abonnement est annulé, mais l’utilisateur conserve encore les privilèges jusqu’au{' '}
                        {formatDate(subscription.currentPeriodEnd)}. Il ne sera pas renouvelé ensuite.
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
};

export default UserTransactionsModal;