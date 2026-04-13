import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { authService } from '../../services/AuthServices';
import { subscriptionService } from '../../services/SubscriptionService';
import type { SubscriptionType } from '../../types/SubscriptionTypes';
import { formatCountdown } from '../../utils/subscriptionAccess';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description?: string;
  maxEvents: number;
  maxPosts: number;
  displayOrder: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const CHECKOUT_GUARD_KEY = 'subscription-checkout-guard';
const FINALIZE_GUARD_KEY = 'subscription-finalize-guard';

const readRouteGuard = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    // --- IGNORE ---
    return null;
  }
};

const writeRouteGuard = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // --- IGNORE ---
  }
};

const clearRouteGuard = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // --- IGNORE ---
  }
};

const isFutureDate = (value: string | null | undefined) => {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp) && timestamp > Date.now();
};

const Subscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<SubscriptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [resuming, setResuming] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [isProcessingRoute, setIsProcessingRoute] = useState(false);
  const [isResolvingSubscriptionState, setIsResolvingSubscriptionState] = useState(false);
  const [transactionMessage, setTransactionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState<null | string>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentStep = location.pathname.startsWith('/subscription/')
    ? location.pathname.slice('/subscription/'.length)
    : '';
  const isCheckoutStep = currentStep === 'checkout';
  const isSuccessStep = currentStep === 'success';
  const isCancelStep = currentStep === 'cancel';
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const navigationState = location.state as {
    transactionMessage?: { type: 'success' | 'error'; text: string };
    preloadedSubscriptions?: SubscriptionType[] | null;
  } | null;
  const activeSubscriptions = userSubscriptions.filter(
    (sub) => sub.status === 'active',
  );
  const activeUserSubscription = userSubscriptions.find(
    (sub) => sub.status === 'active',
  );
  const cancelingCandidates = userSubscriptions.filter(
    (sub) =>
      sub.status === 'canceled' &&
      isFutureDate(sub.currentPeriodEnd) &&
      // Exclude subscriptions canceled immediately (e.g. replaced by a new plan).
      (sub.endedAt === null || isFutureDate(sub.endedAt)) &&
      // If a plan is currently active, only show canceling state for that same plan.
      (!activeUserSubscription || sub.planId === activeUserSubscription.planId),
  );

  const latestCancelingSubscription =
    cancelingCandidates.length > 0
      ? [...cancelingCandidates].sort((first, second) => {
          const firstDate = new Date(
            first.canceledAt ?? first.currentPeriodEnd ?? 0,
          ).getTime();
          const secondDate = new Date(
            second.canceledAt ?? second.currentPeriodEnd ?? 0,
          ).getTime();
          return secondDate - firstDate;
        })[0]
      : null;

  const cancelingSubscriptions = latestCancelingSubscription
    ? [latestCancelingSubscription]
    : [];
  const hasMultipleActiveSubscriptions = activeSubscriptions.length > 1;
  useEffect(() => {
    if (cancelingSubscriptions.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cancelingSubscriptions.length]);

  useEffect(() => {
    if (!isCheckoutStep && !isSuccessStep && !isCancelStep) {
      clearRouteGuard(CHECKOUT_GUARD_KEY);
      clearRouteGuard(FINALIZE_GUARD_KEY);
      setIsProcessingRoute(false);
    }
  }, [isCancelStep, isCheckoutStep, isSuccessStep]);

  useEffect(() => {
    if (!hasMultipleActiveSubscriptions) {
      setIsResolvingSubscriptionState(false);
      return;
    }

    const user = authService.getStoredUser();
    const userId = user?.id;

    if (!userId) {
      return;
    }

    let cancelled = false;

    const resolveSubscriptions = async () => {
      setIsResolvingSubscriptionState(true);

      try {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const subs = await subscriptionService.getUserSubscriptions(userId);
          const normalized = Array.isArray(subs) ? subs : [];
          const activeCount = normalized.filter(
            (sub) => sub.status === 'active',
          ).length;

          if (cancelled) {
            return;
          }

          setUserSubscriptions(normalized);

          if (activeCount <= 1) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch {
        // --- IGNORE ---
      } finally {
        if (!cancelled) {
          setIsResolvingSubscriptionState(false);
        }
      }
    };

    void resolveSubscriptions();

    return () => {
      cancelled = true;
    };
  }, [hasMultipleActiveSubscriptions]);

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
            if (Array.isArray(navigationState?.preloadedSubscriptions)) {
              setUserSubscriptions(navigationState.preloadedSubscriptions);
            } else {
              try {
                const subs = await subscriptionService.getUserSubscriptions(user.id);
                setUserSubscriptions(Array.isArray(subs) ? subs : []);
              } catch {
                // --- IGNORE ---
                setUserSubscriptions([]);
              }
            }
          }
        }
      } catch {
        setError('Impossible de charger les plans');
      } finally {
        setLoading(false);
      }
    };

    if (isCheckoutStep || isSuccessStep || isCancelStep) {
      setLoading(false);
      return;
    }

    fetchPlansAndSubs();
  }, [isCancelStep, isCheckoutStep, isSuccessStep, navigationState?.preloadedSubscriptions]);

  useEffect(() => {
    if (navigationState?.transactionMessage) {
      clearRouteGuard(FINALIZE_GUARD_KEY);
      setIsProcessingRoute(false);
      setTransactionMessage(navigationState.transactionMessage);
      if (Array.isArray(navigationState.preloadedSubscriptions)) {
        setUserSubscriptions(navigationState.preloadedSubscriptions);
      }
      navigate('/subscription', { replace: true, state: null });
      return;
    }

    if (new URLSearchParams(location.search).get('success') === '0') {
      clearRouteGuard(CHECKOUT_GUARD_KEY);
      clearRouteGuard(FINALIZE_GUARD_KEY);
      setIsProcessingRoute(false);
      setTransactionMessage({
        type: 'error',
        text: 'Erreur de transaction.',
      });
      navigate('/subscription', { replace: true });
    }
  }, [location.search, navigate, navigationState]);

  useEffect(() => {
    if (!isCheckoutStep) {
      return;
    }

    const redirectToCheckout = async () => {
      setIsProcessingRoute(true);
      const planId = searchParams.get('planId');
      const user = authService.getStoredUser();
      const userId = user?.id;
      const customerEmail = user?.email;
      const guardValue = planId && userId ? `${userId}:${planId}` : null;

      if (!planId) {
        clearRouteGuard(CHECKOUT_GUARD_KEY);
        navigate('/subscription', {
          replace: true,
          state: {
            transactionMessage: {
              type: 'error' as const,
              text: 'Plan invalide.',
            },
          },
        });
        return;
      }

      if (!userId || !customerEmail) {
        clearRouteGuard(CHECKOUT_GUARD_KEY);
        navigate('/subscription', {
          replace: true,
          state: {
            transactionMessage: {
              type: 'error' as const,
              text: 'Session utilisateur invalide. Reconnectez-vous.',
            },
          },
        });
        return;
      }

      if (guardValue && readRouteGuard(CHECKOUT_GUARD_KEY) === guardValue) {
        return;
      }

      if (guardValue) {
        writeRouteGuard(CHECKOUT_GUARD_KEY, guardValue);
      }

      try {
        const successUrl = `${window.location.origin}/subscription/success?planId=${encodeURIComponent(planId)}`;
        const cancelUrl = `${window.location.origin}/subscription/cancel`;
        const data = await subscriptionService.createCheckoutSession({
          userId,
          planId,
          successUrl,
          cancelUrl,
          customerEmail,
        });

        window.location.replace(data.url);
      } catch {
        clearRouteGuard(CHECKOUT_GUARD_KEY);
        navigate('/subscription', {
          replace: true,
          state: {
            transactionMessage: {
              type: 'error' as const,
              text: 'Erreur lors de la souscription',
            },
          },
        });
      }
    };

    void redirectToCheckout();
  }, [isCheckoutStep, navigate, searchParams]);

  useEffect(() => {
    if (!isSuccessStep) {
      return;
    }

    const finalize = async () => {
      setIsProcessingRoute(true);
      const user = authService.getStoredUser();
      const userId = user?.id;
      const planId = searchParams.get('planId');
      const guardValue = planId && userId ? `${userId}:${planId}` : null;

      if (!userId || !planId) {
        clearRouteGuard(FINALIZE_GUARD_KEY);
        navigate('/subscription', {
          replace: true,
          state: {
            transactionMessage: {
              type: 'success' as const,
              text: 'Abonnement souscrit avec succès.',
            },
          },
        });
        return;
      }

      if (guardValue && readRouteGuard(FINALIZE_GUARD_KEY) === guardValue) {
        return;
      }

      if (guardValue) {
        writeRouteGuard(FINALIZE_GUARD_KEY, guardValue);
      }

      let nextTransactionMessage: {
        type: 'success' | 'error';
        text: string;
      } = {
        type: 'success',
        text: 'Abonnement souscrit avec succès.',
      };
      let resolvedSubscriptions: SubscriptionType[] | null = null;

      try {
        await subscriptionService.finalizePlanChange({
          userId,
          activePlanId: planId,
        });

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const subs = await subscriptionService.getUserSubscriptions(userId);
          const normalized = Array.isArray(subs) ? subs : [];
          const activeSubs = normalized.filter((sub) => sub.status === 'active');
          const hasTargetActive = activeSubs.some((sub) => sub.planId === planId);

          resolvedSubscriptions = normalized;

          if (activeSubs.length <= 1 && hasTargetActive) {
            break;
          }

          await sleep(500);

          if (attempt === 7) {
            throw new Error(
              'Le nouveau plan actif n\'a pas encore été synchronisé.',
            );
          }
        }
      } catch (error) {
        const detail =
          error instanceof Error && error.message.trim().length > 0
            ? ` (${error.message})`
            : '';
        nextTransactionMessage = {
          type: 'error',
          text: `Paiement validé, mais l'ancien abonnement n'a pas pu être annulé automatiquement.${detail}`,
        };
      }

      clearRouteGuard(CHECKOUT_GUARD_KEY);
      navigate('/subscription', {
        replace: true,
        state: {
          transactionMessage: nextTransactionMessage,
          preloadedSubscriptions: resolvedSubscriptions,
        },
      });
    };

    void finalize();
  }, [isSuccessStep, navigate, searchParams]);

  useEffect(() => {
    if (!isCancelStep) {
      return;
    }

    setIsProcessingRoute(false);
    navigate('/subscription', {
      replace: true,
      state: {
        transactionMessage: {
          type: 'error' as const,
          text: 'Erreur de transaction.',
        },
      },
    });
  }, [isCancelStep, navigate]);

  const handleSubscribe = async (planId: string) => {
    if (!isLogged) {
      setShowAuthChoice(planId);
      return;
    }
    clearRouteGuard(CHECKOUT_GUARD_KEY);
    clearRouteGuard(FINALIZE_GUARD_KEY);
    setError(null);
    setTransactionMessage(null);
    setIsProcessingRoute(true);
    setSubscribing(planId);
    navigate(`/subscription/checkout?planId=${encodeURIComponent(planId)}`);
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
                endedAt: sub.currentPeriodEnd ?? sub.endedAt,
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

  const handleResumeSubscription = async (stripeSubscriptionId: string) => {
    const user = authService.getStoredUser();
    const userId = user?.id;

    if (!userId) {
      setError('Session utilisateur invalide. Reconnectez-vous.');
      return;
    }

    setResuming(stripeSubscriptionId);
    try {
      await subscriptionService.resumeSubscription({
        userId,
        stripeSubscriptionId,
      });

      setUserSubscriptions((prev) =>
        prev.map((sub) =>
          sub.stripeSubscriptionId === stripeSubscriptionId
            ? {
                ...sub,
                status: 'active',
                canceledAt: null,
                endedAt: null,
              }
            : sub,
        ),
      );

      setTransactionMessage({
        type: 'success',
        text: "L'annulation a été retirée. Votre abonnement continue normalement.",
      });
      setError(null);
    } catch {
      setTransactionMessage({
        type: 'error',
        text: "Impossible de retirer l'annulation de l'abonnement.",
      });
      setError("Erreur lors de la reprise de l'abonnement");
    } finally {
      setResuming(null);
    }
  };

  if (
    loading ||
    isProcessingRoute ||
    hasMultipleActiveSubscriptions ||
    isResolvingSubscriptionState
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 text-thunder-gold">Choisissez votre abonnement</h1>
          <div className="rounded-2xl border border-thunder-gold/30 bg-thunder-gold/10 p-6 text-center font-medium text-thunder-gold">
            {loading
              ? 'Chargement des plans...'
              : 'Mise à jour de votre abonnement en cours...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-center md:text-left text-thunder-gold">Choisissez votre abonnement</h1>
        {isLogged && (
          <Link
            to="/subscription-history"
            className="inline-flex items-center justify-center rounded-lg border border-thunder-gold/40 px-4 py-2 font-semibold text-thunder-gold transition-colors hover:bg-thunder-gold hover:text-black"
          >
            Voir mes transactions
          </Link>
        )}
      </div>
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
        <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-center font-medium text-red-300">
          {error}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-8">
        {[...plans]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((plan) => {
          const maxEventsLabel =
            plan.maxEvents === -1
              ? 'Illimité'
              : `${plan.maxEvents}`;
          const maxPostsLabel =
            plan.maxPosts === -1
              ? 'Illimité'
              : `${plan.maxPosts}`;

          const activePlanSub = activeUserSubscription?.planId === plan.id
            ? activeUserSubscription
            : null;
          const cancelingPlanSub =
            cancelingSubscriptions.find((sub) => sub.planId === plan.id) ?? null;
          const userSub = activePlanSub ?? cancelingPlanSub;
            return (
            <div key={plan.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg flex flex-col items-center">
              <h2 className="text-xl font-bold mb-2 text-white">{plan.name}</h2>
              <div className="text-3xl font-bold text-thunder-gold mb-2">
                {plan.price} {plan.currency} / {plan.interval === 'monthly' ? 'mois' : 'an'}
              </div>
              {plan.description && (
                <p className="text-gray-400 mb-4 text-center">{plan.description}</p>
              )}
              <div className="w-full mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                <p>
                  <span className="text-gray-400">Evenements max:</span> {maxEventsLabel}
                </p>
                <p>
                  <span className="text-gray-400">Posts max:</span> {maxPostsLabel}
                </p>
              </div>
              {userSub && userSub.status === 'active' ? (
                <div className="mt-auto w-full flex flex-col gap-3">
                  <div className="px-6 py-2 bg-green-500/25 text-green-300 font-semibold rounded text-center border border-green-500/50">
                    Déjà inscrit à ce plan
                  </div>
                  <button
                    onClick={() => handleCancelSubscription(userSub.stripeSubscriptionId)}
                    disabled={!!canceling}
                    className="px-6 py-2 bg-red-500/30 text-red-200 font-semibold rounded border border-red-500/50 hover:bg-red-500/40 transition-colors disabled:opacity-60"
                  >
                    {canceling === userSub.stripeSubscriptionId ? 'Annulation...' : "Annuler l'abonnement"}
                  </button>
                </div>
              ) : userSub && userSub.status === 'canceled' ? (
                <div className="mt-auto w-full flex flex-col gap-3">
                  <div className="px-4 py-3 bg-amber-500/20 text-amber-200 font-semibold rounded text-center border border-amber-500/40">
                    Désabonnement programmé
                  </div>
                  <p className="text-center text-sm text-amber-100">
                    Vous ne serez bientôt plus abonné. Temps restant:
                  </p>
                  <p className="text-center font-mono text-lg text-amber-100">
                    {formatCountdown(userSub.currentPeriodEnd ?? '', nowMs)}
                  </p>
                  <button
                    onClick={() => handleResumeSubscription(userSub.stripeSubscriptionId)}
                    disabled={!!resuming || !!canceling}
                    className="px-6 py-2 bg-emerald-500/25 text-emerald-200 font-semibold rounded border border-emerald-500/50 hover:bg-emerald-500/35 transition-colors disabled:opacity-60"
                  >
                    {resuming === userSub.stripeSubscriptionId
                      ? 'Réactivation...'
                      : "Réactiver l’abonnement"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!subscribing || !!canceling || !!resuming}
                  className="mt-auto px-6 py-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold rounded transition-colors disabled:opacity-60"
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
            className="px-6 py-2 bg-white/10 border border-white/20 text-white font-semibold rounded hover:bg-white/20 transition-colors w-full"
            onClick={() => {
              setShowAuthChoice(null);
              navigate('/login?redirect=subscription');
            }}
          >
            Oui, j'ai un compte
          </button>
          <button
            className="px-6 py-2 bg-white/10 border border-white/20 text-white font-semibold rounded hover:bg-white/20 transition-colors w-full"
            onClick={() => {
              setShowAuthChoice(null);
              navigate('/register?redirect=subscription');
            }}
          >
            Non, je veux m'inscrire
          </button>
        </div>
      </Modal>
      </div>
    </div>
  );
};

export default Subscription;