import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';
import { eventService } from '../../services/EventService';
import { postService } from '../../services/PostService';
import type { EventItem } from '../../types/EventTypes';
import type {
  CreatePostPayload,
  PostItem,
  PostStatus,
  PostTargetStatus,
  SocialNetwork,
} from '../../types/PostTypes';

const statusLabel: Record<PostStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Programmé',
  awaiting_confirmation: 'En attente de confirmation',
  published: 'Publié',
  archived: 'Annulé',
};

const targetStatusLabel: Record<PostTargetStatus, string> = {
  pending: 'En attente',
  published: 'Publié',
  failed: 'Échec',
  cancelled: 'Annulé',
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('fr-FR');
};

const targetStatusStyle = (status: PostTargetStatus) => {
  if (status === 'published') {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  }
  if (status === 'failed') {
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  }
  if (status === 'cancelled') {
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
  return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
};

const AdminSocialPosts = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [content, setContent] = useState('');
  const [eventId, setEventId] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const base = new Date();
    base.setMinutes(base.getMinutes() + 30);
    return toDateInputValue(base);
  });
  const [selectedNetworks, setSelectedNetworks] = useState<SocialNetwork[]>([
    'x',
  ]);

  const eventNameById = useMemo(
    () =>
      new Map(
        events.map((event) => [event.id, event.title] as const),
      ),
    [events],
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [loadedEvents, loadedPosts] = await Promise.all([
        eventService.fetchEvents(),
        postService.fetchMyPosts(),
      ]);
      setEvents(loadedEvents);
      setPosts(loadedPosts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setEvents([]);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setContent('');
    setEventId('');
    const base = new Date();
    base.setMinutes(base.getMinutes() + 30);
    setScheduledAt(toDateInputValue(base));
    setSelectedNetworks(['x']);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const cleanedContent = content.trim();
    if (!cleanedContent) {
      setError('Le contenu du post est requis.');
      return;
    }

    if (selectedNetworks.length === 0) {
      setError('Sélectionne au moins un réseau social.');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      setError('Date de planification invalide.');
      return;
    }

    if (scheduledDate <= new Date()) {
      setError('La date de planification doit etre dans le futur.');
      return;
    }

    const payload: CreatePostPayload = {
      content: cleanedContent,
      scheduled_at: scheduledDate.toISOString(),
      networks: selectedNetworks,
      event_id: eventId || undefined,
    };

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await postService.createPost(payload);
      setSuccess('Post programmé avec succès. Un e-mail de confirmation sera envoyé à l heure planifiée.');
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (post: PostItem) => {
    if (post.status === 'published' || post.status === 'archived') {
      setError('Ce post ne peut plus être supprimé.');
      return;
    }

    if (!confirm('Supprimer ce post programmé ?')) {
      return;
    }

    try {
      setDeletingPostId(post.id);
      setError(null);
      setSuccess(null);
      const result = await postService.deletePost(post.id);
      setSuccess(result.message ?? 'Post supprimé avec succès.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Posts réseaux sociaux"
        subtitle="Planifie des publications X avec confirmation par e-mail"
      />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Publication X manuelle</h2>
        <p className="text-sm text-gray-300">
          Après confirmation par e-mail, l'application ouvre X avec le texte pré-rempli. Tu valides ensuite la publication directement dans X.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Planifier un post</h2>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/20 p-3 text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-3 text-emerald-200">
            {success}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">Contenu</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Écris ton post ici..."
              maxLength={5000}
              rows={5}
              className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-400 focus:border-thunder-gold focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{content.length}/5000</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">Événement (optionnel)</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="" className="bg-thunder-dark text-white">Aucun événement</option>
              {events.map((event) => (
                <option key={event.id} value={event.id} className="bg-thunder-dark text-white">
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">Date de planification</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white focus:border-thunder-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">Réseaux</label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={selectedNetworks.includes('x')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedNetworks(['x']);
                  } else {
                    setSelectedNetworks([]);
                  }
                }}
              />
              X
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg border border-thunder-gold/70 bg-thunder-gold/20 px-5 py-2.5 font-semibold text-thunder-gold transition hover:bg-thunder-gold/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Enregistrement...' : 'Programmer le post'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Historique</h2>

        {loading ? (
          <p className="text-gray-300">Chargement...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-400">Aucun post pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-thunder-gold/40 bg-thunder-gold/20 px-3 py-1 text-xs font-semibold text-thunder-gold">
                    {statusLabel[post.status]}
                  </span>
                  <div className="flex items-center gap-2">
                    {(post.status === 'scheduled' || post.status === 'awaiting_confirmation' || post.status === 'draft') && (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post)}
                        disabled={deletingPostId === post.id}
                        className="rounded-md border border-red-500/50 bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingPostId === post.id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    )}
                    <span className="text-xs text-gray-400">
                      Créé le {formatDate(post.created_at)}
                    </span>
                  </div>
                </div>

                <p className="mb-3 whitespace-pre-wrap text-sm text-gray-200">{post.content}</p>

                <div className="mb-3 flex flex-wrap gap-2">
                  {post.targets.map((target) => (
                    <span
                      key={target.id}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${targetStatusStyle(target.status)}`}
                    >
                      {target.network.toUpperCase()} · {targetStatusLabel[target.status]}
                    </span>
                  ))}
                </div>

                <div className="grid gap-2 text-xs text-gray-400 sm:grid-cols-2">
                  <p>
                    Planifié: {formatDate(post.scheduled_at)}
                  </p>
                  <p>
                    Publié: {formatDate(post.published_at)}
                  </p>
                  <p className="sm:col-span-2">
                    Événement: {post.event_id ? eventNameById.get(post.event_id) ?? post.event_id : '-'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminSocialPosts;