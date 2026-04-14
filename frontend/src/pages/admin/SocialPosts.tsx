import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';
import SocialPostFormModal from '../../components/SocialPostFormModal';
import SocialPostsCalendar from '../../components/SocialPostsCalendar';
import { eventService } from '../../services/EventService';
import { postService } from '../../services/PostService';
import type { EventItem } from '../../types/EventTypes';
import type {
  CreatePostPayload,
  PostItem,
  SocialNetwork,
  UpdatePostPayload,
} from '../../types/PostTypes';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};




const AdminSocialPosts = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

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

  const toLocalDayKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredPosts = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (filterStatus !== 'all' && post.status !== filterStatus) {
        return false;
      }

      if (filterDate) {
        const scheduledDate = post.scheduled_at ? new Date(post.scheduled_at) : null;
        if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
          return false;
        }
        if (toLocalDayKey(scheduledDate) !== filterDate) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const owner = post.owner;
      const ownerFullName = `${owner?.firstName ?? ''} ${owner?.lastName ?? ''}`.trim();
      const eventName = post.event_id ? eventNameById.get(post.event_id) ?? '' : '';

      const haystack = [
        post.content,
        post.user_id,
        owner?.id ?? '',
        owner?.email ?? '',
        ownerFullName,
        eventName,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [eventNameById, filterDate, filterQuery, filterStatus, posts]);

  const canEditPost = (post: PostItem) => {
    return post.status === 'draft' || post.status === 'scheduled';
  };

  const canDeletePost = (post: PostItem) => {
    return (
      post.status === 'scheduled' ||
      post.status === 'awaiting_confirmation' ||
      post.status === 'draft'
    );
  };

  const openCreateModal = () => {
    resetForm();
    setFormError(null);
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
    setFormError(null);
  };

  const openEditModal = (post: PostItem) => {
    if (!canEditPost(post)) {
      setError('Ce post ne peut plus etre modifie.');
      return;
    }

    setEditingPostId(post.id);
    setContent(post.content);
    setEventId(post.event_id ?? '');
    const base = post.scheduled_at ? new Date(post.scheduled_at) : new Date();
    if (!post.scheduled_at) {
      base.setMinutes(base.getMinutes() + 30);
    }
    setScheduledAt(toDateInputValue(base));
    setSelectedNetworks(post.targets.length > 0 ? [post.targets[0].network] : ['x']);
    setFormError(null);
    setShowFormModal(true);
  };

  const loadData = async () => {
    try {
      const [loadedEvents, loadedPosts] = await Promise.all([
        eventService.fetchEvents(),
        postService.fetchAdminPosts().catch(() => postService.fetchMyPosts()),
      ]);
      setEvents(loadedEvents);
      setPosts(loadedPosts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setEvents([]);
      setPosts([]);
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
    setEditingPostId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const cleanedContent = content.trim();
    if (!cleanedContent) {
      setFormError('Le contenu du post est requis.');
      return;
    }

    if (selectedNetworks.length === 0) {
      setFormError('Selectionne au moins un reseau social.');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      setFormError('Date de planification invalide.');
      return;
    }

    if (scheduledDate <= new Date()) {
      setFormError('La date de planification doit etre dans le futur.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      setError(null);
      setSuccess(null);

      if (editingPostId) {
        const updatePayload: UpdatePostPayload = {
          content: cleanedContent,
          scheduled_at: scheduledDate.toISOString(),
          networks: selectedNetworks,
          event_id: eventId || undefined,
        };
        await postService.updatePost(editingPostId, updatePayload);
        setSuccess('Post modifie avec succes.');
      } else {
        const payload: CreatePostPayload = {
          content: cleanedContent,
          scheduled_at: scheduledDate.toISOString(),
          networks: selectedNetworks,
          event_id: eventId || undefined,
        };
        await postService.createPost(payload);
        setSuccess('Post programme avec succes. Un e-mail de confirmation sera envoye a l heure planifiee.');
      }

      closeFormModal();
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (post: PostItem) => {
    if (!canDeletePost(post)) {
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
        subtitle="Planifie des publications avec confirmation par e-mail"
        action={
          <button
            onClick={openCreateModal}
            className="w-full rounded-lg border border-white/30 bg-white/15 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/25 md:w-auto"
          >
            Nouveau post
          </button>
        }
      />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Publication manuelle </h2>
        <p className="text-sm text-gray-300">
          Après confirmation par e-mail, l'application ouvre X avec le texte pré-rempli. Tu valides ensuite la publication directement dans X.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/20 p-3 text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-3 text-emerald-200">
          {success}
        </div>
      )}

      <SocialPostFormModal
        isOpen={showFormModal}
        isEditing={Boolean(editingPostId)}
        events={events}
        content={content}
        eventId={eventId}
        scheduledAt={scheduledAt}
        selectedNetworks={selectedNetworks}
        submitting={submitting}
        formError={formError}
        onClose={closeFormModal}
        onSubmit={handleSubmit}
        onContentChange={setContent}
        onEventIdChange={setEventId}
        onScheduledAtChange={setScheduledAt}
        onNetworksChange={setSelectedNetworks}
      />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Statut
            </label>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="all">Tous</option>
              <option value="draft">Brouillon</option>
              <option value="scheduled">Programmé</option>
              <option value="awaiting_confirmation">En attente de confirmation</option>
              <option value="published">Publié</option>
              <option value="archived">Annulé</option>
            </select>
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Recherche
            </label>
            <input
              type="text"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Nom, email, contenu, évènement..."
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('all');
              setFilterQuery('');
              setFilterDate('');
            }}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
          >
            Réinitialiser
          </button>
        </div>
      </section>

      <SocialPostsCalendar
        posts={filteredPosts}
        eventNameById={eventNameById}
        onEditPost={openEditModal}
        onDeletePost={handleDeletePost}
        canEditPost={canEditPost}
        canDeletePost={canDeletePost}
        deletingPostId={deletingPostId}
      />
    </div>
  );
};

export default AdminSocialPosts;