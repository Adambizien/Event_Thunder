import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import Modal from '../../components/Modal';
import { commentService } from '../../services/CommentService';
import { eventCategoryService } from '../../services/EventCategoryService';
import { eventService } from '../../services/EventService';
import { ticketService } from '../../services/TicketService';
import type { CommentItem } from '../../types/CommentTypes';
import type { EventCategory } from '../../types/EventCategoryTypes';
import type { CreateEventPayload, EventItem, EventStatus } from '../../types/EventTypes';
import type { SoldEventTicketItem, TicketCurrency, UpsertTicketTypeInput } from '../../types/TicketTypes';

const statusOptions: EventStatus[] = [
  'draft',
  'published',
  'canceled',
  'completed',
];

const statusLabels: Record<EventStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  canceled: 'Annulé',
  completed: 'Terminé',
};

const toLocalInputDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('fr-FR');
};

const toIsoDateString = (value: string): string | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const toInputDateTimeValue = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COMMENT_PREVIEW_LENGTH = 220;
type StatusFilter = EventStatus | 'all';
type CommentFilter = 'all' | 'with-comments' | 'without-comments';

type TicketTypeFormItem = {
  id?: string;
  name: string;
  description: string;
  price: string;
  currency: TicketCurrency;
  maxQuantity: string;
  soldQuantity: number;
  isActive: boolean;
};

const buildDefaultTicketType = (): TicketTypeFormItem => ({
  name: '',
  description: '',
  price: '',
  currency: 'EUR',
  maxQuantity: '',
  soldQuantity: 0,
  isActive: true,
});

const AdminEvents = () => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [hasSoldTicketsByEvent, setHasSoldTicketsByEvent] = useState<Record<string, boolean>>({});
  const [selectedEventForComments, setSelectedEventForComments] = useState<EventItem | null>(null);
  const [eventComments, setEventComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [selectedEventForSoldTickets, setSelectedEventForSoldTickets] = useState<EventItem | null>(null);
  const [soldTickets, setSoldTickets] = useState<SoldEventTicketItem[]>([]);
  const [loadingSoldTickets, setLoadingSoldTickets] = useState(false);
  const [soldTicketsError, setSoldTicketsError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [ticketTypes, setTicketTypes] = useState<TicketTypeFormItem[]>([
    buildDefaultTicketType(),
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [commentFilter, setCommentFilter] = useState<CommentFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [loadedCategories, loadedEvents] = await Promise.all([
        eventCategoryService.fetchCategories(),
        eventService.fetchEvents(),
      ]);

      const countEntries = await Promise.all(
        loadedEvents.map(async (event) => {
          const count = await commentService.fetchCountByEvent(event.id);
          return [event.id, count] as const;
        }),
      );

      const soldStatusEntries = await Promise.all(
        loadedEvents.map(async (event) => {
          const ticketTypes = await ticketService.getEventTicketTypes(event.id, {
            includeInactive: true,
          });
          const hasSoldTickets = ticketTypes.some((ticketType) => ticketType.sold_quantity > 0);
          return [event.id, hasSoldTickets] as const;
        }),
      );

      setCategories(loadedCategories);
      setEvents(loadedEvents);
      setCommentCounts(Object.fromEntries(countEntries));
      setHasSoldTicketsByEvent(Object.fromEntries(soldStatusEntries));
      if (loadedCategories.length > 0) {
        setCategoryId((prev) => prev || loadedCategories[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setCategories([]);
      setEvents([]);
      setHasSoldTicketsByEvent({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInitialData();
  }, [fetchInitialData]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setAddress('');
    setStartDate('');
    setEndDate('');
    setImageUrl('');
    setStatus('draft');
    setTicketTypes([buildDefaultTicketType()]);
    setEditingEventId(null);
    setFormError(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setAddress('');
    setStartDate('');
    setEndDate('');
    setImageUrl('');
    setStatus('draft');
    setTicketTypes([buildDefaultTicketType()]);
    setEditingEventId(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleEdit = async (event: EventItem) => {
    setTitle(event.title);
    setDescription(event.description);
    setCategoryId(event.category_id);
    setLocation(event.location);
    setAddress(event.address);
    setStartDate(toInputDateTimeValue(event.start_date));
    setEndDate(toInputDateTimeValue(event.end_date));
    setImageUrl(event.image_url || '');
    setStatus(event.status);

    try {
      const existingTicketTypes = await ticketService.getEventTicketTypes(event.id, {
        includeInactive: true,
      });
      if (existingTicketTypes.length > 0) {
        setTicketTypes(
          existingTicketTypes.map((ticketType) => ({
            id: ticketType.id,
            name: ticketType.name,
            description: ticketType.description || '',
            price: String(ticketType.price),
            currency: ticketType.currency,
            maxQuantity:
              ticketType.max_quantity !== null && ticketType.max_quantity !== undefined
                ? String(ticketType.max_quantity)
                : '',
            soldQuantity: ticketType.sold_quantity,
            isActive: ticketType.is_active,
          })),
        );
      } else {
        setTicketTypes([buildDefaultTicketType()]);
      }
      setEditingEventId(event.id);
      setFormError(null);
      setShowForm(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const addTicketTypeRow = () => {
    setTicketTypes((prev) => [...prev, buildDefaultTicketType()]);
  };

  const removeTicketTypeRow = (index: number) => {
    setTicketTypes((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const currentRow = prev[index];
      if (currentRow?.id && currentRow.soldQuantity > 0) {
        setFormError('Suppression impossible: ce ticket a deja des achats associes');
        return prev;
      }

      setFormError(null);
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const updateTicketTypeRow = (
    index: number,
    patch: Partial<TicketTypeFormItem>,
  ) => {
    setTicketTypes((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  };

  const handleDelete = async (id: string) => {
    try {
      const existingTicketTypes = await ticketService.getEventTicketTypes(id, {
        includeInactive: true,
      });

      const hasSoldTickets = existingTicketTypes.some(
        (ticketType) => ticketType.sold_quantity > 0,
      );

      if (hasSoldTickets) {
        setSuccess(null);
        setError('Suppression impossible: des tickets ont deja ete vendus pour cet evenement');
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    try {
      setDeletingEventId(id);
      await ticketService.upsertEventTicketTypes(id, []);
      await eventService.deleteEvent(id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
      setHasSoldTicketsByEvent((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setCommentCounts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setError(null);
      setSuccess('Événement supprimé avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!categoryId) {
      setFormError('Veuillez sélectionner une catégorie');
      return;
    }

    const startDateIso = toIsoDateString(startDate);
    const endDateIso = toIsoDateString(endDate);
    const trimmedDescription = description.trim();
    const trimmedAddress = address.trim();
    const trimmedTitle = title.trim();
    const trimmedLocation = location.trim();

    if (!startDateIso || !endDateIso) {
      setFormError('Veuillez saisir des dates valides');
      return;
    }

    if (trimmedDescription.length < 10) {
      setFormError('La description doit contenir au moins 10 caracteres');
      return;
    }

    if (trimmedAddress.length < 5) {
      setFormError("L'adresse doit contenir au moins 5 caracteres");
      return;
    }

    const storedUserRaw = localStorage.getItem('user');
    let creatorId: string | undefined;
    if (storedUserRaw) {
      try {
        const parsedUser = JSON.parse(storedUserRaw) as { id?: unknown };
        if (typeof parsedUser.id === 'string' && uuidRegex.test(parsedUser.id)) {
          creatorId = parsedUser.id;
        }
      } catch {
        // Ignore invalid localStorage payload
      }
    }

    const payload: CreateEventPayload = {
      creator_id: creatorId,
      title: trimmedTitle,
      description: trimmedDescription,
      category_id: categoryId,
      location: trimmedLocation,
      address: trimmedAddress,
      start_date: startDateIso,
      end_date: endDateIso,
      status,
      image_url: imageUrl.trim() ? imageUrl.trim() : undefined,
    };

    try {
      setSubmitting(true);
      setFormError(null);
      setSuccess(null);

      const normalizedTicketTypes: UpsertTicketTypeInput[] = ticketTypes
        .map((row) => ({
          id: row.id,
          name: row.name.trim(),
          description: row.description.trim(),
          price: Number(row.price),
          currency: row.currency,
          max_quantity: row.maxQuantity.trim() ? Number(row.maxQuantity) : undefined,
          is_active: row.isActive,
        }))
        .filter((row) => row.name.length > 0);

      if (normalizedTicketTypes.length === 0) {
        setFormError('Ajoutez au moins un type de ticket');
        return;
      }

      for (const ticketType of normalizedTicketTypes) {
        if (!Number.isFinite(ticketType.price) || ticketType.price <= 0) {
          setFormError(`Prix invalide pour le ticket \"${ticketType.name}\"`);
          return;
        }
        if (
          ticketType.max_quantity !== undefined &&
          (!Number.isInteger(ticketType.max_quantity) || ticketType.max_quantity <= 0)
        ) {
          setFormError(`Stock max invalide pour le ticket \"${ticketType.name}\"`);
          return;
        }
      }

      if (editingEventId) {
        const updatedEvent = await eventService.updateEvent(editingEventId, payload);
        await ticketService.upsertEventTicketTypes(updatedEvent.id, normalizedTicketTypes);
        setEvents((prev) =>
          prev.map((event) =>
            event.id === editingEventId ? updatedEvent : event,
          ),
        );
        setSuccess("L'événement a été modifié avec succès");
      } else {
        const createdEvent = await eventService.createEvent(payload);
        await ticketService.upsertEventTicketTypes(createdEvent.id, normalizedTicketTypes);
        setEvents((prev) => [createdEvent, ...prev]);
        setCommentCounts((prev) => ({
          ...prev,
          [createdEvent.id]: 0,
        }));
        setHasSoldTicketsByEvent((prev) => ({
          ...prev,
          [createdEvent.id]: false,
        }));
        setSuccess("L'événement a été créé avec succès");
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = events
    .filter((event) => {
      const haystack = `${event.title} ${event.category?.name || ''} ${event.location} ${statusLabels[event.status]}`.toLowerCase();
      const searchWords = searchTerm
        .toLowerCase()
        .split(' ')
        .filter(Boolean);

      const matchesSearch = searchWords.every((word) => haystack.includes(word));
      const matchesStatus = statusFilter === 'all' ? true : event.status === statusFilter;

      const eventCommentCount = commentCounts[event.id] || 0;
      const matchesCommentFilter =
        commentFilter === 'all'
          ? true
          : commentFilter === 'with-comments'
            ? eventCommentCount > 0
            : eventCommentCount === 0;

      return matchesSearch && matchesStatus && matchesCommentFilter;
    })
    .sort((first, second) => {
      const firstTime = new Date(first.start_date).getTime();
      const secondTime = new Date(second.start_date).getTime();
      const compared = firstTime - secondTime;
      return sortOrder === 'asc' ? compared : -compared;
    });

  const closeCommentsModal = () => {
    setSelectedEventForComments(null);
    setEventComments([]);
    setLoadingComments(false);
    setDeletingCommentId(null);
    setExpandedComments({});
  };

  const openCommentsModal = async (event: EventItem) => {
    try {
      setSelectedEventForComments(event);
      setLoadingComments(true);
      const comments = await commentService.fetchByEvent(event.id);
      setEventComments(comments);
      setExpandedComments({});
      setCommentCounts((prev) => ({
        ...prev,
        [event.id]: comments.length,
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setEventComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const closeSoldTicketsModal = () => {
    setSelectedEventForSoldTickets(null);
    setSoldTickets([]);
    setLoadingSoldTickets(false);
    setSoldTicketsError(null);
  };

  const openSoldTicketsModal = async (event: EventItem) => {
    try {
      setSelectedEventForSoldTickets(event);
      setLoadingSoldTickets(true);
      setSoldTicketsError(null);
      const response = await ticketService.getEventSoldTickets(event.id);
      setSoldTickets(response.tickets);
      setError(null);
    } catch (err) {
      setSoldTickets([]);
      setSoldTicketsError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoadingSoldTickets(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedEventForComments) {
      return;
    }

    if (!confirm('Supprimer ce commentaire ?')) {
      return;
    }

    try {
      setDeletingCommentId(commentId);
      await commentService.deleteComment(commentId);
      setEventComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setExpandedComments((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      setCommentCounts((prev) => ({
        ...prev,
        [selectedEventForComments.id]: Math.max(
          0,
          (prev[selectedEventForComments.id] || 0) - 1,
        ),
      }));
      setError(null);
      setSuccess('Commentaire supprimé avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const toggleExpandedComment = (commentId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
        <span className="spinner mr-2 align-middle"></span>
        Chargement des événements...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Créer un événement"
        subtitle="Ajoutez un événement et liez-le à une catégorie"
        action={
          <button
            onClick={openCreateForm}
            className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Nouvel événement
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/20 p-4 text-emerald-200">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="Titre, catégorie, lieu, statut..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publié</option>
              <option value="draft">Brouillon</option>
              <option value="canceled">Annulé</option>
              <option value="completed">Terminé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Commentaires</label>
            <select
              value={commentFilter}
              onChange={(e) => setCommentFilter(e.target.value as CommentFilter)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="all">Tous</option>
              <option value="with-comments">Avec commentaires</option>
              <option value="without-comments">Sans commentaire</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tri</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="desc">Date de debut (plus recente)</option>
              <option value="asc">Date de debut (plus ancienne)</option>
            </select>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingEventId ? "Modifier l'événement" : 'Créer un nouvel événement'}
        size="lg"
      >
        {formError && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300 mb-4">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="Ex: Conference Tech 2026"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="Decrivez votre evenement"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Categorie</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              {categories.length === 0 && <option value="">Aucune categorie</option>}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              {statusOptions.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {statusLabels[statusValue]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lieu</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="Ex: Paris Expo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Adresse</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="Ex: 1 Place de la Porte de Versailles, Paris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date de debut</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date de fin</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">URL image (optionnel)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Billetterie</p>
                <p className="text-xs text-gray-400">Définissez les types de tickets vendus pour cet événement</p>
              </div>
              <button
                type="button"
                onClick={addTicketTypeRow}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg text-sm"
              >
                Ajouter un ticket
              </button>
            </div>

            {ticketTypes.map((ticketType, index) => (
              <div key={ticketType.id || index} className="rounded-lg border border-white/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                    <span>Actif</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ticketType.isActive}
                      onClick={() => updateTicketTypeRow(index, { isActive: !ticketType.isActive })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                        ticketType.isActive
                          ? 'bg-emerald-500/85 border-emerald-400'
                          : 'bg-gray-500/35 border-gray-400/50'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          ticketType.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeTicketTypeRow(index)}
                    disabled={ticketTypes.length <= 1 || (Boolean(ticketType.id) && ticketType.soldQuantity > 0)}
                    title={
                      Boolean(ticketType.id) && ticketType.soldQuantity > 0
                        ? 'Suppression impossible: ce ticket a deja des achats'
                        : undefined
                    }
                    className="ml-auto bg-red-500/25 hover:bg-red-500/30 border border-red-500/40 text-red-200 px-3 py-2 rounded text-xs disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </div>

                {Boolean(ticketType.id) && ticketType.soldQuantity > 0 && (
                  <p className="text-xs text-amber-300">
                    Ce ticket ne peut pas etre supprime car des achats existent deja.
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Nom</label>
                  <input
                    type="text"
                    value={ticketType.name}
                    onChange={(e) => updateTicketTypeRow(index, { name: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:border-thunder-gold focus:outline-none"
                    placeholder="Ex: Early Bird"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Prix</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticketType.price}
                    onChange={(e) => updateTicketTypeRow(index, { price: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:border-thunder-gold focus:outline-none"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Devise</label>
                  <select
                    value={ticketType.currency}
                    onChange={(e) => updateTicketTypeRow(index, { currency: e.target.value as TicketCurrency })}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:border-thunder-gold focus:outline-none"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stock max</label>
                  <input
                    type="number"
                    min="1"
                    value={ticketType.maxQuantity}
                    onChange={(e) => updateTicketTypeRow(index, { maxQuantity: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:border-thunder-gold focus:outline-none"
                    placeholder="Optionnel"
                  />
                </div>
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs text-gray-400 mb-1">Description (optionnel)</label>
                  <input
                    type="text"
                    value={ticketType.description}
                    onChange={(e) => updateTicketTypeRow(index, { description: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:border-thunder-gold focus:outline-none"
                    placeholder="Avantages ou informations du ticket"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting || categories.length === 0}
              className="flex-1 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/15"
            >
              {submitting
                ? 'Sauvegarde...'
                : editingEventId
                ? "Modifier l'événement"
                : "Créer l'événement"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedEventForComments)}
        onClose={closeCommentsModal}
        title={
          selectedEventForComments
            ? `Commentaires - ${selectedEventForComments.title}`
            : 'Commentaires'
        }
        size="lg"
      >
        {loadingComments ? (
          <div className="text-gray-300 text-center py-6">
            <span className="spinner mr-2 align-middle"></span>
            Chargement des commentaires...
          </div>
        ) : eventComments.length === 0 ? (
          <p className="text-gray-300">Aucun commentaire pour cet événement.</p>
        ) : (
          <div className="space-y-4">
            {eventComments.map((comment) => {
              const isLongComment = comment.content.length > COMMENT_PREVIEW_LENGTH;
              const isExpanded = Boolean(expandedComments[comment.id]);
              const visibleComment =
                isLongComment && !isExpanded
                  ? `${comment.content.slice(0, COMMENT_PREVIEW_LENGTH)}...`
                  : comment.content;

              return (
                <div
                  key={comment.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {comment.authorDisplayName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {toLocalInputDateTime(comment.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                      className="bg-red-500/25 hover:bg-red-500/30 border border-red-500/50 text-red-200 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      {deletingCommentId === comment.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>

                  <p className="text-gray-200 whitespace-pre-line leading-6">
                    {visibleComment}
                  </p>

                  {isLongComment && (
                    <button
                      type="button"
                      onClick={() => toggleExpandedComment(comment.id)}
                      className="mt-2 text-sm font-semibold text-thunder-gold underline underline-offset-2 decoration-thunder-gold hover:text-thunder-gold-light"
                    >
                      {isExpanded ? 'Voir moins' : 'Voir plus'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(selectedEventForSoldTickets)}
        onClose={closeSoldTicketsModal}
        title={
          selectedEventForSoldTickets
            ? `Tickets vendus - ${selectedEventForSoldTickets.title}`
            : 'Tickets vendus'
        }
        size="lg"
      >
        {loadingSoldTickets ? (
          <div className="text-gray-300 text-center py-6">
            <span className="spinner mr-2 align-middle"></span>
            Chargement des tickets vendus...
          </div>
        ) : soldTicketsError ? (
          <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-200">
            {soldTicketsError}
          </div>
        ) : soldTickets.length === 0 ? (
          <p className="text-gray-300">Aucun ticket vendu pour cet événement.</p>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {soldTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{ticket.ticket_type.name}</p>
                    <p className="text-xs text-gray-400">Ticket #{ticket.ticket_number}</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Achat: {toLocalInputDateTime(ticket.created_at)}
                  </p>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-200">
                    <span className="text-gray-400">Acheteur:</span> {ticket.ticket_purchase.user_id}
                  </p>
                  <p className="text-gray-200">
                    <span className="text-gray-400">Nom:</span> {ticket.attendee_firstname} {ticket.attendee_lastname}
                  </p>
                  <p className="text-gray-200 md:col-span-2">
                    <span className="text-gray-400">Email:</span> {ticket.attendee_email || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl backdrop-blur-lg">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {events.length === 0
                ? 'Aucun evenement disponible'
                : 'Aucun evenement ne correspond a votre recherche'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Titre</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Categorie</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Lieu</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Debut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Fin</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Commentaires</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-white/10 transition-colors hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{event.title}</p>
                        <p className="text-xs text-gray-500">{event.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{event.category?.name || '-'}</td>
                    <td className="px-6 py-4 text-gray-300">{event.location}</td>
                    <td className="px-6 py-4 text-gray-300">{toLocalInputDateTime(event.start_date)}</td>
                    <td className="px-6 py-4 text-gray-300">{toLocalInputDateTime(event.end_date)}</td>
                    <td className="px-6 py-4 text-gray-300">{statusLabels[event.status]}</td>
                    <td className="px-6 py-4 text-gray-300">{commentCounts[event.id] || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openCommentsModal(event)}
                          className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2 rounded transition-colors"
                        >
                          Commentaires
                        </button>
                        <Link
                          to={`/events/${event.id}`}
                          className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2 rounded transition-colors"
                        >
                          Voir
                        </Link>
                        <button
                          onClick={() => void handleEdit(event)}
                          className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2 rounded transition-colors"
                          disabled={deletingEventId === event.id}
                        >
                          Modifier
                        </button>
                        {hasSoldTicketsByEvent[event.id] ? (
                          <button
                            onClick={() => void openSoldTicketsModal(event)}
                            className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 px-4 py-2 rounded transition-colors"
                          >
                            Tickets
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="bg-red-500/25 hover:bg-red-500/30 border border-red-500/50 text-red-200 px-4 py-2 rounded transition-colors"
                            disabled={deletingEventId === event.id}
                          >
                            {deletingEventId === event.id ? 'Suppression...' : 'Supprimer'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEvents;