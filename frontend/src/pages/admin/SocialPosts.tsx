import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';
import SocialPostFormModal from '../../components/SocialPostFormModal';
import SocialPostsCalendar from '../../components/SocialPostsCalendar';
import SocialPostDetailsCards from '../../components/SocialPostDetailsCards';
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

const statusLabel: Record<PostItem['status'], string> = {
  draft: 'Brouillon',
  scheduled: 'Programmé',
  awaiting_confirmation: 'En attente de confirmation',
  expired: 'Expire',
  published: 'Publié',
  archived: 'Annulé',
};

const statusBadgeClass: Record<PostItem['status'], string> = {
  draft: 'border-white/30 bg-white/10 text-white',
  scheduled: 'border-white/40 bg-white/20 text-white',
  awaiting_confirmation: 'border-amber-400/50 bg-amber-400/20 text-amber-100',
  expired: 'border-orange-500/50 bg-orange-500/20 text-orange-100',
  published: 'border-emerald-400/50 bg-emerald-400/20 text-emerald-100',
  archived: 'border-red-500/50 bg-red-500/20 text-red-100',
};

const CONTENT_PREVIEW_LENGTH = 180;

const truncateContent = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const findConfirmationSentAt = (post: PostItem) => {
  const reminder = post.reminders?.find((entry) =>
    entry.message?.toLowerCase().includes('confirmation'),
  );
  const dateValue = reminder?.sent_at ?? reminder?.created_at;
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const getExpirationDate = (post: PostItem) => {
  const sentAt = findConfirmationSentAt(post);
  if (!sentAt) {
    return null;
  }

  return new Date(sentAt.getTime() + 24 * 60 * 60 * 1000);
};

const normalizeExpiredStatus = (posts: PostItem[]): PostItem[] => {
  const now = Date.now();

  return posts.map((post) => {
    if (post.status !== 'awaiting_confirmation') {
      return post;
    }

    const expiresAt = getExpirationDate(post);
    if (!expiresAt || expiresAt.getTime() > now) {
      return post;
    }

    return {
      ...post,
      status: 'expired' as const,
    };
  });
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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingText, setGeneratingText] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiFeedbackType, setAiFeedbackType] = useState<'success' | 'error' | null>(null);

  const [content, setContent] = useState('');
  const [eventId, setEventId] = useState('');
  const [postMode, setPostMode] = useState<'draft' | 'scheduled'>('scheduled');
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
    setAiFeedback(null);
    setAiFeedbackType(null);
  };

  const openEditModal = (post: PostItem) => {
    if (!canEditPost(post)) {
      setError('Ce post ne peut plus être modifié.');
      return;
    }

    setEditingPostId(post.id);
    setContent(post.content);
    setEventId(post.event_id ?? '');
    setPostMode(post.scheduled_at ? 'scheduled' : 'draft');
    const base = post.scheduled_at ? new Date(post.scheduled_at) : new Date();
    if (!post.scheduled_at) {
      base.setMinutes(base.getMinutes() + 30);
    }
    setScheduledAt(toDateInputValue(base));
    setSelectedNetworks(post.targets.length > 0 ? [post.targets[0].network] : ['x']);
    setFormError(null);
    setAiPrompt('');
    setAiFeedback(null);
    setAiFeedbackType(null);
    setShowFormModal(true);
  };

  const loadData = async () => {
    try {
      const [loadedEvents, loadedPosts] = await Promise.all([
        eventService.fetchEvents(),
        postService.fetchAdminPosts().catch(() => postService.fetchMyPosts()),
      ]);
      setEvents(loadedEvents);
      setPosts(normalizeExpiredStatus(loadedPosts));
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
    setPostMode('scheduled');
    const base = new Date();
    base.setMinutes(base.getMinutes() + 30);
    setScheduledAt(toDateInputValue(base));
    setSelectedNetworks(['x']);
    setEditingPostId(null);
    setAiPrompt('');
    setAiFeedback(null);
    setAiFeedbackType(null);
  };

  const handleGenerateText = async () => {
    if (generatingText) {
      return;
    }

    const cleanedPrompt = aiPrompt.trim();
    if (!cleanedPrompt) {
      setAiFeedback('Ajoute un prompt pour lancer la génération.');
      setAiFeedbackType('error');
      return;
    }

    try {
      setGeneratingText(true);
      setAiFeedback(null);
      setAiFeedbackType(null);

      const result = await postService.generatePostText({
        prompt: cleanedPrompt,
        event_id: eventId || undefined,
      });

      setContent(result.content);
      setAiFeedback(
        `Texte généré. Il te reste ${result.remainingGenerations}/${result.limit} génération(s) sur la période d'une heure.`,
      );
      setAiFeedbackType('success');
    } catch (err) {
      setAiFeedback(err instanceof Error ? err.message : 'Erreur de génération IA.');
      setAiFeedbackType('error');
    } finally {
      setGeneratingText(false);
    }
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

    let scheduledDate: Date | null = null;
    if (postMode === 'scheduled') {
      scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        setFormError('Date de planification invalide.');
        return;
      }

      if (scheduledDate <= new Date()) {
        setFormError('La date de planification doit être dans le futur.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setFormError(null);
      setError(null);
      setSuccess(null);

      if (editingPostId) {
        const updatePayload: UpdatePostPayload = {
          content: cleanedContent,
          scheduled_at: scheduledDate ? scheduledDate.toISOString() : null,
          networks: selectedNetworks,
          event_id: eventId || undefined,
        };
        await postService.updatePost(editingPostId, updatePayload);
        setSuccess(
          postMode === 'draft'
            ? 'Brouillon modifié avec succès.'
            : 'Post programmé modifié avec succès.',
        );
      } else {
        const payload: CreatePostPayload = {
          content: cleanedContent,
          scheduled_at: scheduledDate ? scheduledDate.toISOString() : undefined,
          networks: selectedNetworks,
          event_id: eventId || undefined,
        };
        await postService.createPost(payload);
        setSuccess(
          postMode === 'draft'
            ? "Brouillon créé avec succès. Aucun e-mail de confirmation n'est envoyé."
            : "Post programmé avec succès. Un e-mail de confirmation sera envoyé à l'heure planifiée.",
        );
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
        postMode={postMode}
        content={content}
        eventId={eventId}
        scheduledAt={scheduledAt}
        selectedNetworks={selectedNetworks}
        submitting={submitting}
        generatingText={generatingText}
        aiPrompt={aiPrompt}
        aiFeedback={aiFeedback}
        aiFeedbackType={aiFeedbackType}
        formError={formError}
        onClose={closeFormModal}
        onSubmit={handleSubmit}
        onGenerateText={handleGenerateText}
        onContentChange={setContent}
        onAiPromptChange={setAiPrompt}
        onEventIdChange={setEventId}
        onPostModeChange={setPostMode}
        onScheduledAtChange={setScheduledAt}
        onNetworksChange={setSelectedNetworks}
      />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Affichage
            </label>
            <div className="flex overflow-hidden rounded-lg border border-white/20 bg-black/30">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex-1 px-3 py-2 text-sm transition ${
                  viewMode === 'list' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                Liste
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex-1 px-3 py-2 text-sm transition ${
                  viewMode === 'calendar'
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                Calendrier
              </button>
            </div>
          </div>

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
              <option value="expired">Expiré</option>
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

      {viewMode === 'list' ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-white">Liste des posts</h2>
            <span className="text-sm text-gray-300">{filteredPosts.length} resultat(s)</span>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredPosts.map((post) => {
              const editingAllowed = canEditPost(post);
              const deletingAllowed = canDeletePost(post);
              const eventName = post.event_id
                ? eventNameById.get(post.event_id) ?? post.event_id
                : '-';
              const networks =
                post.targets.length > 0
                  ? post.targets.map((target) => target.network.toUpperCase()).join(', ')
                  : '-';
              const cancellationReason =
                post.status === 'archived' || post.status === 'expired'
                  ? post.targets.find((target) => target.error_message)?.error_message
                  : null;
              const expiresAt = getExpirationDate(post);
              const remainingMs = expiresAt ? expiresAt.getTime() - Date.now() : null;
              const isExpanded = expandedPostIds.has(post.id);
              const isLongContent = post.content.length > CONTENT_PREVIEW_LENGTH;
              const displayedContent =
                isExpanded || !isLongContent
                  ? post.content
                  : truncateContent(post.content, CONTENT_PREVIEW_LENGTH);

              return (
                <article key={post.id} className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass[post.status]}`}
                      >
                        {statusLabel[post.status]}
                      </span>
                      <p className="text-xs text-gray-300">Planifie le: {formatDateTime(post.scheduled_at)}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => openEditModal(post)}
                        disabled={!editingAllowed}
                        className="rounded-md border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post)}
                        disabled={!deletingAllowed || deletingPostId === post.id}
                        className="rounded-md border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingPostId === post.id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </div>

                  <SocialPostDetailsCards
                    post={post}
                    content={displayedContent}
                    contentExpandable={isLongContent}
                    isContentExpanded={isExpanded}
                    onToggleContent={() => {
                      setExpandedPostIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(post.id)) {
                          next.delete(post.id);
                        } else {
                          next.add(post.id);
                        }
                        return next;
                      });
                    }}
                    eventName={eventName}
                    networks={networks}
                    cancellationReason={cancellationReason}
                    expiresAt={expiresAt}
                    remainingMs={remainingMs}
                  />
                </article>
              );
            })}
          </div>

          {filteredPosts.length === 0 && (
            <p className="mt-4 text-sm text-gray-300">Aucun post trouve avec ces filtres.</p>
          )}
        </section>
      ) : (
        <SocialPostsCalendar
          posts={filteredPosts}
          eventNameById={eventNameById}
          onEditPost={openEditModal}
          onDeletePost={handleDeletePost}
          canEditPost={canEditPost}
          canDeletePost={canDeletePost}
          deletingPostId={deletingPostId}
        />
      )}
    </div>
  );
};

export default AdminSocialPosts;
