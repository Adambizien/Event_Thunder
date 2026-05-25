import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { commentService } from '../services/CommentService';
import { eventService } from '../services/EventService';
import { subscriptionService } from '../services/SubscriptionService';
import { ticketService } from '../services/TicketService';
import { userService } from '../services/UserService';
import type { User } from '../types/AuthTypes';
import type { EventItem } from '../types/EventTypes';

interface HomeProps {
  user?: User | null;
}

type HomeStats = {
  totalUsers: number;
  activeOrganizers: number;
  publishedEvents: number;
  completedEvents: number;
};

type RecommendedEvent = EventItem & {
  soldTickets: number;
  commentCount: number;
};

const formatEventDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const Home = ({ user }: HomeProps) => {
  const isAuthenticated = Boolean(user);
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const [stats, setStats] = useState<HomeStats>({
    totalUsers: 0,
    activeOrganizers: 0,
    publishedEvents: 0,
    completedEvents: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [recommendedEvents, setRecommendedEvents] = useState<RecommendedEvent[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [eventsResult, usersStatsResult, activeSubscriberIdsResult] = await Promise.allSettled([
          eventService.fetchPublicEvents(),
          userService.fetchPublicStats(),
          subscriptionService.getPublicActiveSubscriberIds(),
        ]);

        const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
        const usersStats =
          usersStatsResult.status === 'fulfilled' ? usersStatsResult.value : { totalUsers: 0 };
        const activeSubscriberIds =
          activeSubscriberIdsResult.status === 'fulfilled' ? activeSubscriberIdsResult.value : [];
        const organizerIds = new Set(events.map((event) => event.creator_id).filter(Boolean));
        const activeSubscriberIdSet = new Set(activeSubscriberIds);

        setStats({
          totalUsers: usersStats.totalUsers,
          activeOrganizers: Array.from(activeSubscriberIdSet).filter((userId) =>
            organizerIds.has(userId),
          ).length,
          publishedEvents: events.filter((event) => event.status === 'published').length,
          completedEvents: events.filter((event) => event.status === 'completed').length,
        });

        const publishedEvents = events.filter((event) => event.status === 'published');
        const enrichedEvents = await Promise.all(
          publishedEvents.map(async (event) => {
            const [ticketTypesResult, commentCountResult] = await Promise.allSettled([
              ticketService.getEventTicketTypes(event.id),
              commentService.fetchCountByEvent(event.id),
            ]);
            const ticketTypes =
              ticketTypesResult.status === 'fulfilled' ? ticketTypesResult.value : [];
            const soldTickets = ticketTypes.reduce(
              (sum, ticketType) => sum + Number(ticketType.sold_quantity || 0),
              0,
            );
            const commentCount =
              commentCountResult.status === 'fulfilled' ? commentCountResult.value : 0;

            return {
              ...event,
              soldTickets,
              commentCount,
            };
          }),
        );

        setRecommendedEvents(
          enrichedEvents
            .sort((first, second) => {
              if (second.soldTickets !== first.soldTickets) {
                return second.soldTickets - first.soldTickets;
              }
              if (second.commentCount !== first.commentCount) {
                return second.commentCount - first.commentCount;
              }
              return (
                new Date(first.start_date).getTime() -
                new Date(second.start_date).getTime()
              );
            })
            .slice(0, 3),
        );
      } catch {
        setStats({
          totalUsers: 0,
          activeOrganizers: 0,
          publishedEvents: 0,
          completedEvents: 0,
        });
        setRecommendedEvents([]);
      } finally {
        setStatsLoading(false);
        setRecommendationsLoading(false);
      }
    };

    void fetchStats();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-thunder-gold/20 blur-3xl" />
        <div className="absolute top-1/3 left-[-15%] h-72 w-72 rounded-full bg-thunder-orange/15 blur-[110px]" />
        <div className="absolute bottom-[-8%] right-1/4 h-80 w-80 rounded-full bg-thunder-yellow/10 blur-[120px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-left">
            {isAuthenticated && (
              <p className="mb-6 text-3xl md:text-4xl font-black text-thunder-yellow">
                Bienvenue {userName || 'sur Event Thunder'}
              </p>
            )}

            <div className="mb-6 flex items-center gap-3">
              <Logo size="md" />
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.2em] text-gray-200">
                Plateforme tout-en-un
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black leading-tight">
              <span >Event</span>{' '}
              <span className="text-[#ffb020]">Thunder</span>
              <br />
              La solution ultime pour vos événements
            </h1>

            <p className="mt-5 text-lg md:text-xl text-gray-300">
              Créez, pilotez et analysez vos événements avec une interface élégante et rapide. De la création à la billetterie, puis à la communication, tout est intégré.
            </p>

            {!isAuthenticated && (
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10"
                >
                  Commencer maintenant
                </Link>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Fonctionnalités</p>
              <h2 className="text-4xl font-black text-thunder-yellow">Un cockpit complet</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card flex flex-col p-8">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-thunder-gold">Participants</p>
              <h3 className="mb-4 text-2xl font-bold text-white">Assister aux bons événements</h3>
              <p className="text-lg leading-8 text-gray-300">
                Event Thunder simplifie la découverte et l'accès aux événements. Les utilisateurs peuvent parcourir les événements disponibles, consulter les informations importantes, acheter leurs billets en ligne et retrouver facilement leurs réservations depuis leur espace personnel.
              </p>
              <Link
                to="/events"
                className="mt-auto self-end inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10"
              >
                Voir les événements
              </Link>
            </div>

            <div className="card flex flex-col p-8">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-thunder-orange">Organisateurs</p>
              <h3 className="mb-4 text-2xl font-bold text-white">Piloter toute l'organisation</h3>
              <p className="text-lg leading-8 text-gray-300">
                La plateforme centralise la création d'événements, la gestion des catégories, la billetterie, le suivi des ventes et la communication sur les réseaux sociaux. Chaque outil est pensé pour gagner du temps et garder une vision claire de l'activité.
              </p>
              <Link
                to="/subscription"
                className="mt-auto self-end inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10"
              >
                Voir les plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative pb-20 px-4">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          <div className="card min-h-52 p-8 text-center">
            <p className="mb-6 text-center text-gray-400">Utilisateurs inscrits</p>
            <p className="text-5xl font-bold text-thunder-gold">
              {statsLoading ? '...' : stats.totalUsers}
            </p>
          </div>
          <div className="card min-h-52 p-8 text-center">
            <p className="mb-6 text-center text-gray-400">Organisateurs actifs</p>
            <p className="text-5xl font-bold text-thunder-yellow">
              {statsLoading ? '...' : stats.activeOrganizers}
            </p>
          </div>
          <div className="card min-h-52 p-8 text-center">
            <p className="mb-6 text-center text-gray-400">Événements</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-5xl font-bold text-thunder-orange">
                  {statsLoading ? '...' : stats.publishedEvents}
                </p>
                <p className="mt-2 text-sm text-gray-400">En cours</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-thunder-yellow">
                  {statsLoading ? '...' : stats.completedEvents}
                </p>
                <p className="mt-2 text-sm text-gray-400">Terminés</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Events Section */}
      <section className="relative pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="mb-8 text-4xl font-black text-thunder-yellow">Ce qui peut vous plaire :</h2>

          {recommendationsLoading ? (
            <div className="card p-8 text-center text-gray-300">
              Chargement des recommandations...
            </div>
          ) : recommendedEvents.length === 0 ? (
            <div className="card p-8 text-center text-gray-300">
              Aucun événement publié pour le moment.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {recommendedEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="card flex min-h-full flex-col overflow-hidden transition-colors hover:border-white/30"
                >
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="h-40 w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(197,152,73,0.35),transparent_35%),linear-gradient(120deg,#0c2f3e_0%,#095668_55%,#0b1f2c_100%)]" />
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    <p className="mb-2 text-xs uppercase tracking-[0.25em] text-thunder-gold">
                      {event.category?.name || 'Événement'}
                    </p>
                    <h3 className="mb-3 text-xl font-bold text-white">{event.title}</h3>
                    <p className="mb-5 line-clamp-3 text-sm leading-6 text-gray-300">
                      {event.description}
                    </p>
                    <div className="mt-auto space-y-3 text-sm text-gray-300">
                      <div className="space-y-1">
                        <p>Début: {formatEventDate(event.start_date)}</p>
                        <p>Fin: {formatEventDate(event.end_date)}</p>
                        <p>Lieu: {event.location}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
                        <span>{event.soldTickets} tickets vendus</span>
                        <span>{event.commentCount} commentaires</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default Home;
