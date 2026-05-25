import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import { eventService } from '../../services/EventService';
import { postService } from '../../services/PostService';
import { subscriptionService } from '../../services/SubscriptionService';
import { ticketService } from '../../services/TicketService';
import type { User } from '../../types/AuthTypes';
import type { EventItem } from '../../types/EventTypes';
import type { PostItem } from '../../types/PostTypes';
import {
  formatCountdown,
  getOrganizerAccessState,
  getOrganizerPlanLimits,
} from '../../utils/subscriptionAccess';

interface OrganizerDashboardProps {
  user: User;
}

type EventTicketStats = {
  eventId: string;
  eventTitle: string;
  ticketsCount: number;
  paidTicketsCount: number;
  refundedTicketsCount: number;
  revenue: number;
  currency: string;
};

const OrganizerDashboard = ({ user }: OrganizerDashboardProps) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [eventTicketStats, setEventTicketStats] = useState<EventTicketStats[]>([]);
  const [maxPublishedEvents, setMaxPublishedEvents] = useState(0);
  const [maxScheduledPosts, setMaxScheduledPosts] = useState(0);
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

        const [allEvents, subscriptions, loadedPosts] = await Promise.all([
          eventService.fetchEvents(),
          subscriptionService.getUserSubscriptions(user.id),
          postService.fetchMyPosts(),
        ]);

        const ownEvents = allEvents.filter((event) => event.creator_id === user.id);
        const accessState = getOrganizerAccessState(subscriptions);
        const planLimits = getOrganizerPlanLimits(subscriptions);
        const ticketsByEvent = await Promise.all(
          ownEvents.map(async (event) => {
            const response = await ticketService
              .getEventSoldTickets(event.id)
              .catch(() => ({ event_id: event.id, count: 0, tickets: [] }));

            const currency =
              response.tickets.find((ticket) => ticket.ticket_purchase.currency)
                ?.ticket_purchase.currency ?? 'EUR';
            const refundedTicketsCount = response.tickets.filter((ticket) =>
              Boolean(ticket.ticket_purchase.refunded_at) ||
              ticket.ticket_purchase.status === 'refunded',
            ).length;
            const revenue = response.tickets.reduce((total, ticket) => {
              if (
                ticket.ticket_purchase.refunded_at ||
                ticket.ticket_purchase.status === 'refunded'
              ) {
                return total;
              }

              return total + Number(ticket.ticket_type.price ?? 0);
            }, 0);

            return {
              eventId: event.id,
              eventTitle: event.title,
              ticketsCount: response.count,
              paidTicketsCount: response.tickets.filter(
                (ticket) => ticket.ticket_purchase.status === 'paid',
              ).length,
              refundedTicketsCount,
              revenue,
              currency,
            };
          }),
        );

        setEvents(ownEvents);
        setPosts(loadedPosts);
        setEventTicketStats(ticketsByEvent);
        setMaxPublishedEvents(planLimits.maxEvents);
        setMaxScheduledPosts(planLimits.maxPosts);
        setHasActiveSubscription(accessState.hasAccess || Boolean(user.planId));
        setIsGracePeriod(accessState.isGracePeriod);
        setGracePeriodEnd(accessState.gracePeriodEnd);
      } catch {
        setError('Impossible de charger les données organisateur.');
        setEvents([]);
        setPosts([]);
        setEventTicketStats([]);
        setMaxPublishedEvents(0);
        setMaxScheduledPosts(0);
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
    const scheduledPosts = posts.filter((post) => post.status === 'scheduled').length;
    const ticketsSold = eventTicketStats.reduce(
      (total, eventStats) => total + eventStats.ticketsCount,
      0,
    );
    const paidTickets = eventTicketStats.reduce(
      (total, eventStats) => total + eventStats.paidTicketsCount,
      0,
    );
    const refundedTickets = eventTicketStats.reduce(
      (total, eventStats) => total + eventStats.refundedTicketsCount,
      0,
    );
    const topEvents = eventTicketStats
      .filter((eventStats) => eventStats.ticketsCount > 0)
      .sort((firstEvent, secondEvent) => {
        if (secondEvent.ticketsCount !== firstEvent.ticketsCount) {
          return secondEvent.ticketsCount - firstEvent.ticketsCount;
        }

        return secondEvent.revenue - firstEvent.revenue;
      })
      .slice(0, 3);

    return {
      total: events.length,
      published,
      draft,
      completed,
      canceled,
      postsTotal: posts.length,
      draftPosts: posts.filter((post) => post.status === 'draft').length,
      scheduledPosts,
      awaitingConfirmationPosts: posts.filter(
        (post) => post.status === 'awaiting_confirmation',
      ).length,
      publishedPosts: posts.filter((post) => post.status === 'published').length,
      archivedPosts: posts.filter((post) => post.status === 'archived').length,
      expiredPosts: posts.filter((post) => post.status === 'expired').length,
      ticketsSold,
      paidTickets,
      refundedTickets,
      ticketRevenue: eventTicketStats.reduce(
        (total, eventStats) => total + eventStats.revenue,
        0,
      ),
      ticketCurrency: eventTicketStats[0]?.currency ?? 'EUR',
      topEvents,
    };
  }, [eventTicketStats, events, posts]);

  const publishedEventsLimitLabel =
    maxPublishedEvents === -1 ? 'Illimité' : `${stats.published}/${maxPublishedEvents}`;
  const scheduledPostsLimitLabel =
    maxScheduledPosts === -1 ? 'Illimité' : `${stats.scheduledPosts}/${maxScheduledPosts}`;

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <p className="text-sm font-semibold text-white">Quota du plan:</p>
          <p className="mt-2 text-gray-300">
            {publishedEventsLimitLabel} événement(s) publié(s) simultanément.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <p className="text-sm font-semibold text-white">Quota du plan:</p>
          <p className="mt-2 text-gray-300">
            {scheduledPostsLimitLabel} post(s) programmé(s) simultanément.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <h2 className="text-lg font-semibold text-white">Actions rapides</h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-300">
          Lancez un nouvel événement ou préparez une publication pour vos réseaux sociaux
          directement depuis votre espace organisateur.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/organizer/create-event"
            className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/20"
          >
            Créer un événement
          </Link>
          <Link
            to="/organizer/social-posts"
            className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/20"
          >
            Créer un post
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Événements</h2>
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
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Top événements</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Top 3 événements</p>
                <p className="text-xl font-semibold text-white">Meilleures ventes tickets</p>
              </div>
              <span className="text-2xl font-semibold text-thunder-gold">Top 3</span>
            </div>

            {stats.topEvents.length > 0 ? (
              <div className="space-y-3">
                {stats.topEvents.map((eventStats, index) => (
                  <div
                    key={eventStats.eventId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-thunder-gold text-sm font-bold text-black">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {eventStats.eventTitle}
                        </p>
                        <p className="text-sm text-gray-300">
                          {formatCurrency(eventStats.revenue, eventStats.currency)}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-gray-300">
                      {eventStats.ticketsCount} ticket
                      {eventStats.ticketsCount > 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-300">Aucune vente de ticket pour le moment.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Tickets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Tickets vendus</p>
            <p className="text-3xl font-bold text-white">{stats.ticketsSold}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Payés</p>
            <p className="text-3xl font-bold text-white">{stats.paidTickets}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Remboursés</p>
            <p className="text-3xl font-bold text-white">{stats.refundedTickets}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Revenu tickets</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(stats.ticketRevenue, stats.ticketCurrency)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Posts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Total posts</p>
            <p className="text-3xl font-bold text-white">{stats.postsTotal}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Brouillons</p>
            <p className="text-3xl font-bold text-white">{stats.draftPosts}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Programmés</p>
            <p className="text-3xl font-bold text-white">{stats.scheduledPosts}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">En attente</p>
            <p className="text-3xl font-bold text-white">
              {stats.awaitingConfirmationPosts}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Publiés</p>
            <p className="text-3xl font-bold text-white">{stats.publishedPosts}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Expirés</p>
            <p className="text-3xl font-bold text-white">{stats.expiredPosts}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
            <p className="text-gray-300 text-sm mb-1">Archivés</p>
            <p className="text-3xl font-bold text-white">{stats.archivedPosts}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;