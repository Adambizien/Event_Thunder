import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventService } from '../../services/EventService';
import type { EventItem } from '../../types/EventTypes';

type EventsTab = 'current' | 'archive';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('fr-FR');
};

const statusLabel: Record<EventItem['status'], string> = {
  draft: 'Brouillon',
  published: 'En cours',
  canceled: 'Annulé',
  completed: 'Terminé',
};

const EventsList = () => {
  const [tab, setTab] = useState<EventsTab>('current');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const data = await eventService.fetchPublicEvents();
        setEvents(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchEvents();
  }, []);

  const categories = useMemo(() => {
    const names = new Set(
      events
        .map((event) => event.category?.name)
        .filter((name): name is string => Boolean(name)),
    );

    return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [events]);

  const filteredEvents = useMemo(() => {
    const statusFiltered = events.filter((event) => {
      if (tab === 'current') {
        return event.status === 'published';
      }
      return event.status === 'canceled' || event.status === 'completed';
    });

    const textFiltered = statusFiltered.filter((event) => {
      const haystack = `${event.title} ${event.description} ${event.location} ${event.category?.name || ''}`.toLowerCase();
      const searchWords = search.toLowerCase().split(' ').filter(Boolean);
      return searchWords.every((word) => haystack.includes(word));
    });

    const categoryFiltered = textFiltered.filter((event) => {
      if (selectedCategory === 'all') {
        return true;
      }
      return event.category?.name === selectedCategory;
    });

    return categoryFiltered.sort((a, b) => {
      const first = new Date(a.start_date).getTime();
      const second = new Date(b.start_date).getTime();
      return sortOrder === 'asc' ? first - second : second - first;
    });
  }, [events, search, selectedCategory, sortOrder, tab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12">
        <div className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
          <span className="spinner mr-2 align-middle"></span>
          Chargement des événements...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-thunder-gold mb-2">Événements</h1>
          <p className="text-gray-300">Decouvrez les événements en cours et les archives.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setTab('current')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                tab === 'current'
                  ? 'bg-thunder-gold text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              En cours
            </button>
            <button
              type="button"
              onClick={() => setTab('archive')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                tab === 'archive'
                  ? 'bg-thunder-gold text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Archives
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Recherche</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
                placeholder="Titre, lieu, catégorie..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tri</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              >
                <option value="asc">Date de début (plus proche)</option>
                <option value="desc">Date de début (plus lointaine)</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-200">
            {error}
          </div>
        )}

        {filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
            Aucun événement trouve pour cette section.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg flex flex-col gap-4"
              >
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="h-44 w-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-44 w-full rounded-lg bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(197,152,73,0.35),transparent_35%),linear-gradient(120deg,#0c2f3e_0%,#095668_55%,#0b1f2c_100%)]" />
                )}

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                    {event.category?.name || 'Sans catégorie'} - {statusLabel[event.status]}
                  </p>
                  <h2 className="text-xl font-bold text-white mb-2">{event.title}</h2>
                  <p className="text-gray-300 text-sm line-clamp-3">{event.description}</p>
                </div>

                <div className="text-sm text-gray-300 space-y-1">
                  <p>Lieu: {event.location}</p>
                  <p>Debut: {formatDate(event.start_date)}</p>
                  <p>Fin: {formatDate(event.end_date)}</p>
                </div>

                <Link
                  to={`/events/${event.id}`}
                  className="mt-auto inline-flex justify-center bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Voir le detail
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;
