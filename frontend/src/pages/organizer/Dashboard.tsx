import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import { eventService } from '../../services/EventService';
import { subscriptionService } from '../../services/SubscriptionService';
import type { User } from '../../types/AuthTypes';
import type { EventItem } from '../../types/EventTypes';
import { formatCountdown, getOrganizerAccessState } from '../../utils/subscriptionAccess';

interface OrganizerDashboardProps {
  user: User;
}

const OrganizerDashboard = ({ user }: OrganizerDashboardProps) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(Boolean(user.planId));
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [gracePeriodEnd, setGracePeriodEnd] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user.id) {
        setError('Session utilisateur invalide.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [allEvents, subscriptions] = await Promise.all([
          eventService.fetchEvents(),
          subscriptionService.getUserSubscriptions(user.id),
        ]);

        const ownEvents = allEvents.filter((event) => event.creator_id === user.id);
        const accèssState = getOrganizerAccessState(subscriptions);

        setEvents(ownEvents);
        setHasActiveSubscription(accèssState.hasAccess || Boolean(user.planId));
        setIsGracePeriod(accèssState.isGracePeriod);
        setGracePeriodEnd(accèssState.gracePeriodEnd);
      } catch {
        setError('Impossible de charger les données organisateur.');
        setEvents([]);
        setHasActiveSubscription(Boolean(user.planId));
        setIsGracePeriod(false);
        setGracePeriodEnd(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [user.id, user.planId]);

  useEffect(() => {
    if (!isGracePeriod || !gracePeriodEnd) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isGracePeriod, gracePeriodEnd]);

  useEffect(() => {
    if (!isGracePeriod || !gracePeriodEnd) {
      return;
    }

    const endTime = new Date(gracePeriodEnd).getTime();
    if (Number.isNaN(endTime)) {
      return;
    }

    if (nowMs >= endTime) {
      setHasActiveSubscription(false);
      setIsGracePeriod(false);
      setGracePeriodEnd(null);
    }
  }, [isGracePeriod, gracePeriodEnd, nowMs]);

  const stats = useMemo(() => {
    const published = events.filter((event) => event.status === 'published').length;
    const draft = events.filter((event) => event.status === 'draft').length;
    const completed = events.filter((event) => event.status === 'completed').length;
    const canceled = events.filter((event) => event.status === 'canceled').length;

    return {
      total: events.length,
      published,
      draft,
      completed,
      canceled,
    };
  }, [events]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
        Chargement de votre tableau de bord organisateur...
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
        title="Tableau de bord organisateur"
        subtitle="Pilotez vos événements et votre accès au plan abonné"
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-300">Statut abonnement</p>
            <p className="text-xl font-bold text-white">
              {hasActiveSubscription ? 'Abonnement actif' : 'Aucun abonnement actif'}
            </p>
          </div>
          {!hasActiveSubscription && (
            <Link
              to="/subscription"
              className="inline-flex items-center justify-center rounded-lg border border-thunder-gold/40 px-4 py-2 font-semibold text-thunder-gold transition-colors hover:bg-thunder-gold hover:text-black"
            >
              S'abonner maintenant
            </Link>
          )}
        </div>
      </div>

      {isGracePeriod && gracePeriodEnd && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/15 p-6 shadow-2xl backdrop-blur-lg">
          <h2 className="text-lg font-bold text-amber-200">Abonnement annule: accès temporaire</h2>
          <p className="mt-2 text-amber-100/90">
            Vous ne serez bientôt plus abonné et devrez renouveler l'abonnement, mais vous avez encore accès aux privilèges pour l'instant.
          </p>
          <p className="mt-3 font-mono text-xl text-amber-100">
            {formatCountdown(gracePeriodEnd, nowMs)}
          </p>
          <p className="mt-2 text-sm text-amber-100/80">
            Fin de période: {new Date(gracePeriodEnd).toLocaleString('fr-FR')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <p className="text-gray-300 text-sm mb-1">Total événements</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <p className="text-gray-300 text-sm mb-1">Publiés</p>
          <p className="text-3xl font-bold text-white">{stats.published}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <p className="text-gray-300 text-sm mb-1">Brouillons</p>
          <p className="text-3xl font-bold text-white">{stats.draft}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <p className="text-gray-300 text-sm mb-1">Terminés</p>
          <p className="text-3xl font-bold text-white">{stats.completed}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <p className="text-gray-300 text-sm mb-1">Annulés</p>
          <p className="text-3xl font-bold text-white">{stats.canceled}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <h2 className="text-lg font-semibold text-white">Actions rapides</h2>
        <p className="mt-2 text-sm text-gray-300">
          Créez un nouvel événement depuis la section dediee.
        </p>
        <div className="mt-4">
          <Link
            to="/organizer/create-event"
            className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/20"
          >
            Aller à la création d'événement
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
