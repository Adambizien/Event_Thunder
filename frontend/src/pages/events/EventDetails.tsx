import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventService } from '../../services/EventService';
import type { EventItem } from '../../types/EventTypes';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('fr-FR');
};

const getStatusBanner = (status: EventItem['status']) => {
  if (status === 'published') {
    return {
      text: 'Cet evenement est en cours',
      className: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200',
      badge: 'En cours',
    };
  }

  if (status === 'canceled') {
    return {
      text: 'Cet evenement est annule',
      className: 'border-red-500/50 bg-red-500/30 text-red-200',
      badge: 'Annule',
    };
  }

  if (status === 'completed') {
    return {
      text: 'Cet evenement est termine',
      className: 'border-blue-500/50 bg-blue-500/20 text-blue-200',
      badge: 'Termine',
    };
  }

  return {
    text: 'Cet evenement est en brouillon',
    className: 'border-amber-500/50 bg-amber-500/20 text-amber-200',
    badge: 'Brouillon',
  };
};

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) {
        setError('Evenement introuvable');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await eventService.fetchEventById(id);
        setEvent(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        if (message.toLowerCase().includes('inaccessible')) {
          setError('Cet evenement est inaccessible');
        } else {
          setError(message);
        }
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12">
        <div className="max-w-4xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
          <span className="spinner mr-2 align-middle"></span>
          Chargement de l'evenement...
        </div>
      </div>
    );
  }

  if (!event || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-2xl border border-red-500/50 bg-red-500/30 p-6 text-red-200 shadow-2xl backdrop-blur-lg">
            {error || 'Evenement introuvable'}
          </div>
          <Link
            to="/"
            className="inline-flex bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Retour a l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const banner = getStatusBanner(event.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className={`rounded-xl border p-4 text-center font-semibold ${banner.className}`}>
          {banner.text}
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="h-[320px] w-full object-cover"
            />
          ) : (
            <div className="h-[320px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(197,152,73,0.35),transparent_35%),linear-gradient(120deg,#0c2f3e_0%,#095668_55%,#0b1f2c_100%)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {banner.badge}
              </span>
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {event.category?.name || 'Sans categorie'}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-white drop-shadow-md">
              {event.title}
            </h1>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/20 bg-black/25 p-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-gray-300">Debut</p>
                <p className="text-white font-medium">{formatDate(event.start_date)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-gray-300">Fin</p>
                <p className="text-white font-medium">{formatDate(event.end_date)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-gray-300">Lieu</p>
                <p className="text-white font-medium">{event.location}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-2xl backdrop-blur-lg">
            <h2 className="text-2xl font-bold text-thunder-gold mb-4">A propos de cet evenement</h2>
            <p className="text-gray-200 whitespace-pre-line leading-7">
              {event.description}
            </p>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Informations pratiques</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Adresse</p>
                  <p className="text-white">{event.address}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Lieu</p>
                  <p className="text-white">{event.location}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Date de debut</p>
                  <p className="text-white">{formatDate(event.start_date)}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Date de fin</p>
                  <p className="text-white">{formatDate(event.end_date)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Etat de l'evenement</p>
              <p className="text-white font-semibold">{banner.text}</p>
            </div>
          </aside>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Retour a l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
