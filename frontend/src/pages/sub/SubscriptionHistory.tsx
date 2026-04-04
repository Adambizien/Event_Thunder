import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SubscriptionDetailsContent from '../../components/SubscriptionDetailsContent';
import { authService } from '../../services/AuthServices';
import { subscriptionService } from '../../services/SubscriptionService';
import type { SubscriptionType } from '../../types/SubscriptionTypes';

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
            className="inline-flex items-center justify-center rounded-lg border border-thunder-gold/40 px-4 py-2 font-semibold text-thunder-gold transition-colors hover:bg-thunder-gold hover:text-black"
          >
            Voir les offres
          </Link>
        </div>

        <SubscriptionDetailsContent
          subscriptions={subscriptions}
          loading={loading}
          error={error}
          actionMessage={actionMessage}
          openingInvoiceId={openingInvoiceId}
          cancelingSubscriptionId={cancelingSubscriptionId}
          onOpenInvoice={(stripeInvoiceId) => {
            void handleOpenInvoice(stripeInvoiceId);
          }}
          onCancelSubscription={(stripeSubscriptionId) => {
            void handleCancelSubscription(stripeSubscriptionId);
          }}
          loadingLabel="Chargement de vos abonnements et transactions..."
          activeEmptyLabel="Vous n’avez actuellement aucun abonnement actif."
          transactionsEmptyLabel="Aucune transaction disponible pour le moment."
          canceledEmptyLabel="Aucun abonnement annulé pour le moment."
        />
      </div>
    </div>
  );
};

export default SubscriptionHistory;