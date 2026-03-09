import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/AuthServices';
import { subscriptionService } from '../../services/SubscriptionService';
import type { SubscriptionType } from '../../types/SubscriptionTypes';

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

const SubscriptionHistory = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);
  const [cancelingSubscriptionId, setCancelingSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const user = authService.getStoredUser();

        if (!user?.id) {
          setError('Session utilisateur invalide. Reconnectez-vous.');
          setSubscriptions([]);
          return;
        }

        const data = await subscriptionService.getUserSubscriptions(user.id);
        setSubscriptions(Array.isArray(data) ? data : []);
        setError(null);
      } catch {
        setError('Impossible de charger vos abonnements et transactions.');
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchSubscriptions();
  }, []);

  const activeSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.status === 'active') ?? null,
    [subscriptions],
  );

  const canceledSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.status === 'canceled'),
    [subscriptions],
  );

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

  const handleOpenInvoice = async (stripeInvoiceId: string) => {
    if (!stripeInvoiceId) {
      setError('Facture Stripe indisponible pour cette transaction.');
      return;
    }

    try {
      setOpeningInvoiceId(stripeInvoiceId);
      setError(null);
      const { hostedInvoiceUrl, invoicePdfUrl } =
        await subscriptionService.getInvoiceLinks(stripeInvoiceId);
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
    const user = authService.getStoredUser();
    const userId = user?.id;

    if (!userId) {
      setError('Session utilisateur invalide. Reconnectez-vous.');
      return;
    }

    const confirmed = window.confirm(
      'Voulez-vous vraiment annuler votre abonnement actuel ?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancelingSubscriptionId(stripeSubscriptionId);
      setError(null);
      setActionMessage(null);

      await subscriptionService.cancelSubscription({
        userId,
        stripeSubscriptionId,
      });

      try {
        const data = await subscriptionService.getUserSubscriptions(userId);
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
        text: 'Votre abonnement a bien été annulé.',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-thunder-gold/30 bg-white/5 p-8 text-center text-thunder-gold">
            Chargement de vos abonnements et transactions...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-thunder-gold">Mes abonnements et transactions</h1>
            <p className="text-gray-300">
              Consultez votre abonnement actuel, vos abonnements annulés et l’historique de vos paiements.
            </p>
          </div>
          <Link
            to="/subscription"
            className="inline-flex items-center justify-center rounded-lg bg-thunder-gold px-4 py-2 font-semibold text-black transition-colors hover:bg-thunder-orange"
          >
            Voir les offres
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {actionMessage && (
          <div
            className={`rounded-xl border p-4 ${
              actionMessage.type === 'success'
                ? 'border-green-500/40 bg-green-500/10 text-green-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Abonnement actuel</h2>
            {activeSubscription ? (
              <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm font-semibold text-green-300">
                Actif
              </span>
            ) : (
              <span className="rounded-full bg-gray-500/15 px-3 py-1 text-sm font-semibold text-gray-300">
                Aucun abonnement actif
              </span>
            )}
          </div>

          {activeSubscription ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-thunder-gold/20 bg-thunder-gold/10 p-4">
                  <p className="text-sm text-gray-300">Plan</p>
                  <p className="mt-1 text-xl font-bold text-white">{activeSubscription.plan.name}</p>
                  <p className="text-sm text-thunder-gold">{getIntervalLabel(activeSubscription.plan.interval)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-gray-300">Tarif</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {formatCurrency(activeSubscription.plan.price, activeSubscription.plan.currency)}
                  </p>
                  <p className="text-sm text-gray-400">par période</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-gray-300">Début de période</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatDate(activeSubscription.currentPeriodStart)}
                  </p>
                  <p className="text-sm text-gray-400">Stripe ID: {activeSubscription.stripeSubscriptionId}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-gray-300">Fin de période</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatDate(activeSubscription.currentPeriodEnd)}
                  </p>
                  <p className="text-sm text-thunder-gold">{getRemainingLabel(activeSubscription.currentPeriodEnd)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 md:flex-row md:items-center md:justify-between">
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
                  className="inline-flex items-center justify-center rounded-lg border border-red-400/50 px-4 py-2 font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelingSubscriptionId === activeSubscription.stripeSubscriptionId
                    ? 'Annulation...'
                    : 'Annuler l’abonnement'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-gray-300">
              Vous n’avez actuellement aucun abonnement actif.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <h2 className="mb-4 text-2xl font-semibold text-white">Transactions</h2>
          {payments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-gray-300">
              Aucune transaction disponible pour le moment.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-left">
                  <thead className="bg-white/5 text-sm text-gray-300">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Montant</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                      <th className="px-4 py-3 font-semibold">Facture Stripe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-sm text-white">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="bg-transparent">
                        <td className="px-4 py-3 text-gray-300">
                          {formatDate(payment.paidAt ?? payment.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{payment.subscription.plan.name}</div>
                          <div className="text-xs text-gray-400">
                            {payment.subscription.status === 'active' ? 'Abonnement actif' : 'Abonnement annulé'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-thunder-gold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              payment.status === 'paid'
                                ? 'bg-green-500/15 text-green-300'
                                : 'bg-red-500/15 text-red-300'
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
                            className="rounded-lg border border-thunder-gold/40 px-3 py-2 text-xs font-semibold text-thunder-gold transition-colors hover:bg-thunder-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
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
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <h2 className="mb-4 text-2xl font-semibold text-white">Abonnements annulés</h2>
          {canceledSubscriptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-gray-300">
              Aucun abonnement annulé pour le moment.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {canceledSubscriptions.map((subscription) => (
                <article
                  key={subscription.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{subscription.plan.name}</h3>
                      <p className="text-sm text-gray-400">
                        {formatCurrency(subscription.plan.price, subscription.plan.currency)} • {getIntervalLabel(subscription.plan.interval)}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
                      Annulé
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>
                      <span className="text-gray-400">Début :</span> {formatDate(subscription.currentPeriodStart)}
                    </p>
                    <p>
                      <span className="text-gray-400">Fin :</span> {formatDate(subscription.endedAt ?? subscription.currentPeriodEnd)}
                    </p>
                    <p>
                      <span className="text-gray-400">Date d’annulation :</span> {formatDate(subscription.canceledAt)}
                    </p>
                    <p>
                      <span className="text-gray-400">Stripe ID :</span> {subscription.stripeSubscriptionId}
                    </p>
                  </div>

                  {hasAccessUntilEnd(subscription.currentPeriodEnd) && (
                    <div className="mt-4 rounded-lg border border-thunder-gold/30 bg-thunder-gold/10 p-4 text-sm text-thunder-gold">
                      Cet abonnement est annulé, mais l’utilisateur conserve encore les privilèges jusqu’au
                      {' '}
                      {formatDate(subscription.currentPeriodEnd)}.
                      {' '}
                      Il ne sera pas renouvelé ensuite.
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SubscriptionHistory;