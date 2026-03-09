import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { authService } from '../../services/AuthServices';
import { subscriptionService } from '../../services/SubscriptionService';
import type { SubscriptionType } from '../../types/SubscriptionTypes';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description?: string;
  maxEvents: number;
  maxPosts: number;
  maxEventsPeriod: 'weekly' | 'monthly';
  maxPostsPeriod: 'weekly' | 'monthly';
  displayOrder: number;
}

const Subscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<SubscriptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [transactionMessage, setTransactionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState<null | string>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const fetchPlansAndSubs = async () => {
      try {
        setLoading(true);
        const data = await subscriptionService.getPlans();
        setPlans(Array.isArray(data) ? data : []);
        setError(null);
        const token = localStorage.getItem('token');
        setIsLogged(!!token);
        if (token) {
          const user = authService.getStoredUser();
          if (user?.id) {
            try {
              const subs = await subscriptionService.getUserSubscriptions(user.id);
              setUserSubscriptions(Array.isArray(subs) ? subs : []);
            } catch {
              setUserSubscriptions([]);
            }
          }
        }
      } catch {
        setError('Impossible de charger les plans');
      } finally {
        setLoading(false);
      }
    };
    fetchPlansAndSubs();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    const planId = params.get('planId');

    if (success === '1') {
      const finalize = async () => {
        const user = authService.getStoredUser();
        const userId = user?.id;

        if (!userId || !planId) {
          setTransactionMessage({
            type: 'success',
            text: 'Abonnement souscrit avec succès.',
          });
          navigate('/subscription', { replace: true });
          return;
        }

        try {
          await subscriptionService.finalizePlanChange({
            userId,
            activePlanId: planId,
          });
          setTransactionMessage({
            type: 'success',
            text: 'Abonnement souscrit avec succès.',
          });
        } catch {
          setTransactionMessage({
            type: 'error',
            text: "Paiement validé, mais l'ancien abonnement n'a pas pu être annulé automatiquement.",
          });
        } finally {
          navigate('/subscription', { replace: true });
          const subs = await subscriptionService.getUserSubscriptions(userId);
          setUserSubscriptions(Array.isArray(subs) ? subs : []);
        }
      };
      void finalize();
      return;
    }

    if (success === '0') {
      setTransactionMessage({
        type: 'error',
        text: 'Erreur de transaction.',
      });
      navigate('/subscription', { replace: true });
    }
  }, [location.search, navigate]);

  const handleSubscribe = async (planId: string) => {
    if (!isLogged) {
      setShowAuthChoice(planId);
      return;
    }
    setSubscribing(planId);
    try {
      const successUrl = `${window.location.origin}/subscription?success=1&planId=${encodeURIComponent(planId)}`;
      const cancelUrl = `${window.location.origin}/subscription?success=0`;
      const user = authService.getStoredUser();
      const userId = user?.id;
      const customerEmail = user?.email;
      if (!userId || !customerEmail) {
        setError('Session utilisateur invalide. Reconnectez-vous.');
        setSubscribing(null);
        return;
      }
      const data = await subscriptionService.createCheckoutSession({
        userId,
        planId,
        successUrl,
        cancelUrl,
        customerEmail,
      });
      window.location.href = data.url;
    } catch {
      setError('Erreur lors de la souscription');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async (stripeSubscriptionId: string) => {
    const user = authService.getStoredUser();
    const userId = user?.id;

    if (!userId) {
      setError('Session utilisateur invalide. Reconnectez-vous.');
      return;
    }

    setCanceling(stripeSubscriptionId);
    try {
      await subscriptionService.cancelSubscription({
        userId,
        stripeSubscriptionId,
      });

      const nowIso = new Date().toISOString();
      setUserSubscriptions((prev) =>
        prev.map((sub) =>
          sub.stripeSubscriptionId === stripeSubscriptionId
            ? {
                ...sub,
                status: 'canceled',
                canceledAt: nowIso,
                endedAt: nowIso,
              }
            : sub,
        ),
      );
      setTransactionMessage({
        type: 'success',
        text: 'Annulation de l’abonnement effectuée avec succès.',
      });
      setError(null);
    } catch {
      setTransactionMessage({
        type: 'error',
        text: "L'annulation de l'abonnement a échoué.",
      });
      setError("Erreur lors de l'annulation de l'abonnement");
    } finally {
      setCanceling(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Chargement des plans...</div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Choisissez votre abonnement</h1>
      {transactionMessage && (
        <div
          className={`mb-6 rounded-lg border p-4 text-center font-medium ${
            transactionMessage.type === 'success'
              ? 'border-green-700 bg-green-900/20 text-green-300'
              : 'border-red-700 bg-red-900/20 text-red-300'
          }`}
        >
          {transactionMessage.text}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-700 bg-red-900/20 p-4 text-center font-medium text-red-300">
          {error}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-8">
        {[...plans]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((plan) => {
          const maxEventsLabel =
            plan.maxEvents === -1
              ? `Illimité / ${plan.maxEventsPeriod === 'weekly' ? 'semaine' : 'mois'}`
              : `${plan.maxEvents} / ${plan.maxEventsPeriod === 'weekly' ? 'semaine' : 'mois'}`;
          const maxPostsLabel =
            plan.maxPosts === -1
              ? `Illimité / ${plan.maxPostsPeriod === 'weekly' ? 'semaine' : 'mois'}`
              : `${plan.maxPosts} / ${plan.maxPostsPeriod === 'weekly' ? 'semaine' : 'mois'}`;

          const userSub = userSubscriptions.find(
            (sub) => sub.planId === plan.id && sub.status === 'active'
          );
            return (
            <div key={plan.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col items-center">
              <h2 className="text-xl font-bold mb-2 text-white">{plan.name}</h2>
              <div className="text-3xl font-bold text-thunder-gold mb-2">
                {plan.price} {plan.currency} / {plan.interval === 'monthly' ? 'mois' : 'an'}
              </div>
              {plan.description && (
                <p className="text-gray-400 mb-4 text-center">{plan.description}</p>
              )}
              <div className="w-full mb-4 rounded-lg border border-gray-800 bg-gray-950/50 p-3 text-sm text-gray-300">
                <p>
                  <span className="text-gray-400">Evenements max:</span> {maxEventsLabel}
                </p>
                <p>
                  <span className="text-gray-400">Posts max:</span> {maxPostsLabel}
                </p>
              </div>
              {userSub ? (
                <div className="mt-auto w-full flex flex-col gap-3">
                  <div className="px-6 py-2 bg-green-700 text-white font-semibold rounded opacity-80 text-center">
                    Déjà inscrit à ce plan (actif)
                  </div>
                  <button
                    onClick={() => handleCancelSubscription(userSub.stripeSubscriptionId)}
                    disabled={!!canceling}
                    className="px-6 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {canceling === userSub.stripeSubscriptionId ? 'Annulation...' : "Annuler l'abonnement"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!subscribing || !!canceling}
                  className="mt-auto px-6 py-2 bg-thunder-gold text-black font-semibold rounded hover:bg-thunder-orange transition-colors disabled:opacity-60"
                >
                  {subscribing === plan.id ? 'Redirection...' : 'S’abonner'}
                </button>
              )}
            </div>
            );
          })}
      </div>

      {/* Modal choix inscription/connexion */}
      <Modal
        isOpen={!!showAuthChoice}
        onClose={() => setShowAuthChoice(null)}
        title="Avez-vous déjà un compte ?"
        size="sm"
      >
        <div className="flex flex-col gap-4 items-center">
          <button
            className="px-6 py-2 bg-thunder-gold text-black font-semibold rounded hover:bg-thunder-orange transition-colors w-full"
            onClick={() => {
              setShowAuthChoice(null);
              navigate('/login?redirect=subscription');
            }}
          >
            Oui, j'ai déjà un compte
          </button>
          <button
            className="px-6 py-2 bg-gray-700 text-white font-semibold rounded hover:bg-thunder-gold hover:text-black transition-colors w-full"
            onClick={() => {
              setShowAuthChoice(null);
              navigate('/register?redirect=subscription');
            }}
          >
            Non, je veux m'inscrire
          </button>
          <button
            className="mt-2 text-gray-400 hover:text-white text-sm underline"
            onClick={() => setShowAuthChoice(null)}
          >
            Annuler
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Subscription;