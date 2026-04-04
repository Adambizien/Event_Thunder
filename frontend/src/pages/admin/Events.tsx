import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import EventCommentsModal from '../../components/EventCommentsModal';
import EventFormModal from '../../components/EventFormModal';
import EventSoldTicketsModal from '../../components/EventSoldTicketsModal';
import { type TicketPurchaseCardData } from '../../components/TicketPurchaseCards';
import UniformTable from '../../components/UniformTable';
import { commentService } from '../../services/CommentService';
import { eventCategoryService } from '../../services/EventCategoryService';
import { eventService } from '../../services/EventService';
import { ticketService } from '../../services/TicketService';
import type { CommentItem } from '../../types/CommentTypes';
import type { EventCategory } from '../../types/EventCategoryTypes';
import type { CreateEventPayload, EventItem, EventStatus } from '../../types/EventTypes';
import type { SoldEventTicketItem, TicketCurrency, UpsertTicketTypeInput } from '../../types/TicketTypes';

const statusLabels: Record<EventStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  canceled: 'Annulé',
  completed: 'Terminé',
};

const ticketPurchaseStatusLabels: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  succeeded: 'Payé',
  completed: 'Payé',
  failed: 'Échoué',
  canceled: 'Annulé',
  refunded: 'Remboursé',
};

const toTicketPurchaseStatusLabel = (status: string) =>
  ticketPurchaseStatusLabels[status.toLowerCase()] ?? status;

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
  const navigate = useNavigate();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [hasSoldTicketsByEvent, setHasSoldTicketsByEvent] = useState<Record<string, boolean>>({});
  const [ticketTypeCountByEvent, setTicketTypeCountByEvent] = useState<Record<string, number>>({});
  const [soldTicketCountByEvent, setSoldTicketCountByEvent] = useState<Record<string, number>>({});
  const [selectedEventForComments, setSelectedEventForComments] = useState<EventItem | null>(null);
  const [eventComments, setEventComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [selectedEventForSoldTickets, setSelectedEventForSoldTickets] = useState<EventItem | null>(null);
  const [soldTickets, setSoldTickets] = useState<SoldEventTicketItem[]>([]);
  const [soldTicketsSearchTerm, setSoldTicketsSearchTerm] = useState('');
  const [loadingSoldTickets, setLoadingSoldTickets] = useState(false);
  const [soldTicketsError, setSoldTicketsError] = useState<string | null>(null);
  const [openingSoldTicketInvoiceId, setOpeningSoldTicketInvoiceId] = useState<string | null>(null);

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
  const [openActionMenuEventId, setOpenActionMenuEventId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const closeActionMenu = () => {
    setOpenActionMenuEventId(null);
    setActionMenuPosition(null);
  };

  const openActionMenu = (eventId: string, trigger: HTMLElement) => {
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 256;
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    setActionMenuPosition({
      top: rect.bottom + 8,
      left,
    });
    setOpenActionMenuEventId(eventId);
  };

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

      const ticketStatsEntries = await Promise.all(
        loadedEvents.map(async (event) => {
          const ticketTypes = await ticketService.getEventTicketTypes(event.id, {
            includeInactive: true,
          });
          const hasSoldTickets = ticketTypes.some((ticketType) => ticketType.sold_quantity > 0);
          const soldTicketsCount = ticketTypes.reduce(
            (sum, ticketType) => sum + ticketType.sold_quantity,
            0,
          );

          return [
            event.id,
            {
              hasSoldTickets,
              ticketTypesCount: ticketTypes.length,
              soldTicketsCount,
            },
          ] as const;
        }),
      );

      const soldStatusEntries = ticketStatsEntries.map(([eventId, stats]) => [
        eventId,
        stats.hasSoldTickets,
      ] as const);
      const ticketTypeCountEntries = ticketStatsEntries.map(([eventId, stats]) => [
        eventId,
        stats.ticketTypesCount,
      ] as const);
      const soldTicketCountEntries = ticketStatsEntries.map(([eventId, stats]) => [
        eventId,
        stats.soldTicketsCount,
      ] as const);

      setCategories(loadedCategories);
      setEvents(loadedEvents);
      setCommentCounts(Object.fromEntries(countEntries));
      setHasSoldTicketsByEvent(Object.fromEntries(soldStatusEntries));
      setTicketTypeCountByEvent(Object.fromEntries(ticketTypeCountEntries));
      setSoldTicketCountByEvent(Object.fromEntries(soldTicketCountEntries));
      if (loadedCategories.length > 0) {
        setCategoryId((prev) => prev || loadedCategories[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setCategories([]);
      setEvents([]);
      setHasSoldTicketsByEvent({});
      setTicketTypeCountByEvent({});
      setSoldTicketCountByEvent({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[data-action-menu-root="true"]') &&
        !target.closest('[data-action-menu-floating="true"]')
      ) {
        closeActionMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeActionMenu();
      }
    };

    const handleScroll = () => {
      closeActionMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

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
    setOpenActionMenuEventId(null);
    setActionMenuPosition(null);

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
      setTicketTypeCountByEvent((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSoldTicketCountByEvent((prev) => {
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
        // --- IGNORE ---
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
          setFormError(`Prix invalide pour le ticket "${ticketType.name}"`);
          return;
        }
        if (
          ticketType.max_quantity !== undefined &&
          (!Number.isInteger(ticketType.max_quantity) || ticketType.max_quantity <= 0)
        ) {
          setFormError(`Stock max invalide pour le ticket "${ticketType.name}"`);
          return;
        }
      }

      if (editingEventId) {
        const updatedEvent = await eventService.updateEvent(editingEventId, payload);
        await ticketService.upsertEventTicketTypes(updatedEvent.id, normalizedTicketTypes);
        const updatedTicketTypes = await ticketService.getEventTicketTypes(updatedEvent.id, {
          includeInactive: true,
        });
        setEvents((prev) =>
          prev.map((event) =>
            event.id === editingEventId ? updatedEvent : event,
          ),
        );
        setHasSoldTicketsByEvent((prev) => ({
          ...prev,
          [updatedEvent.id]: updatedTicketTypes.some((ticketType) => ticketType.sold_quantity > 0),
        }));
        setTicketTypeCountByEvent((prev) => ({
          ...prev,
          [updatedEvent.id]: updatedTicketTypes.length,
        }));
        setSoldTicketCountByEvent((prev) => ({
          ...prev,
          [updatedEvent.id]: updatedTicketTypes.reduce(
            (sum, ticketType) => sum + ticketType.sold_quantity,
            0,
          ),
        }));
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
        setTicketTypeCountByEvent((prev) => ({
          ...prev,
          [createdEvent.id]: normalizedTicketTypes.length,
        }));
        setSoldTicketCountByEvent((prev) => ({
          ...prev,
          [createdEvent.id]: 0,
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

  const activeActionEvent =
    openActionMenuEventId !== null
      ? filteredEvents.find((event) => event.id === openActionMenuEventId) || null
      : null;

  const filteredSoldTickets = soldTickets.filter((ticket) => {
    const query = soldTicketsSearchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const haystack = [
      ticket.ticket_type.name,
      ticket.ticket_number,
      ticket.ticket_purchase.user_id,
      ticket.attendee_firstname,
      ticket.attendee_lastname,
      ticket.attendee_email || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });

  const groupedSoldTicketPurchases = useMemo(() => {
    const grouped = new Map<
      string,
      {
        purchase: SoldEventTicketItem['ticket_purchase'];
        createdAt: string;
        buyerFirstname: string;
        buyerLastname: string;
        buyerEmail: string | null;
        tickets: SoldEventTicketItem[];
      }
    >();

    for (const ticket of filteredSoldTickets) {
      const purchaseId = ticket.ticket_purchase.id;
      const existing = grouped.get(purchaseId);

      if (existing) {
        existing.tickets.push(ticket);
        continue;
      }

      grouped.set(purchaseId, {
        purchase: ticket.ticket_purchase,
        createdAt: ticket.created_at,
        buyerFirstname:
          ticket.ticket_purchase.buyer?.firstName ?? ticket.attendee_firstname,
        buyerLastname:
          ticket.ticket_purchase.buyer?.lastName ?? ticket.attendee_lastname,
        buyerEmail:
          ticket.ticket_purchase.buyer?.email ?? ticket.attendee_email ?? null,
        tickets: [ticket],
      });
    }

    return Array.from(grouped.values()).sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );
  }, [filteredSoldTickets]);

  const soldTicketPurchaseCards = useMemo<TicketPurchaseCardData[]>(() => {
    return groupedSoldTicketPurchases.map((purchaseGroup) => {
      const amountDetailsByType = purchaseGroup.tickets.reduce(
        (acc, ticket) => {
          const key = ticket.ticket_type.id;
          const existing = acc.get(key);
          const unitPrice = Number(ticket.ticket_type.price ?? 0);
          const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;

          if (existing) {
            existing.quantity += 1;
            return acc;
          }

          acc.set(key, {
            ticketTypeName: ticket.ticket_type.name,
            unitPrice: safeUnitPrice,
            quantity: 1,
            currency: ticket.ticket_type.currency,
          });
          return acc;
        },
        new Map<
          string,
          {
            ticketTypeName: string;
            unitPrice: number;
            quantity: number;
            currency: TicketCurrency;
          }
        >(),
      );

      const amountDetails = Array.from(amountDetailsByType.values());
      const fallbackTotalAmount = amountDetails.reduce(
        (sum, detail) => sum + detail.unitPrice * detail.quantity,
        0,
      );
      const rawTotalAmount = Number(
        purchaseGroup.purchase.total_amount ?? fallbackTotalAmount,
      );
      const totalAmount = Number.isFinite(rawTotalAmount)
        ? rawTotalAmount
        : fallbackTotalAmount;
      const totalCurrency =
        purchaseGroup.purchase.currency ?? amountDetails[0]?.currency ?? 'EUR';

      return {
        id: purchaseGroup.purchase.id,
        stripePaymentIntentId: purchaseGroup.purchase.stripe_payment_intent_id,
        createdAt: purchaseGroup.createdAt,
        totalAmount,
        currency: totalCurrency,
        buyerId: purchaseGroup.purchase.user_id,
        buyerLastname: purchaseGroup.buyerLastname,
        buyerFirstname: purchaseGroup.buyerFirstname,
        buyerEmail: purchaseGroup.buyerEmail,
        statusLabel: toTicketPurchaseStatusLabel(purchaseGroup.purchase.status),
        ticketCount: purchaseGroup.tickets.length,
        lineItems: amountDetails.map((detail) => ({
          id: `${purchaseGroup.purchase.id}-${detail.ticketTypeName}`,
          label: detail.ticketTypeName,
          quantity: detail.quantity,
          amount: detail.unitPrice * detail.quantity,
          currency: detail.currency,
        })),
        tickets: purchaseGroup.tickets.map((ticket) => ({
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          attendeeLastname: ticket.attendee_lastname,
          attendeeFirstname: ticket.attendee_firstname,
          attendeeEmail: ticket.attendee_email,
          ticketTypeName: ticket.ticket_type.name,
          statusLabel: 'Valide',
        })),
      };
    });
  }, [groupedSoldTicketPurchases]);

  const closeCommentsModal = () => {
    setSelectedEventForComments(null);
    setEventComments([]);
    setLoadingComments(false);
    setDeletingCommentId(null);
    setExpandedComments({});
  };

  const openCommentsModal = async (event: EventItem) => {
    try {
      closeActionMenu();
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
    setSoldTicketsSearchTerm('');
    setLoadingSoldTickets(false);
    setOpeningSoldTicketInvoiceId(null);
    setSoldTicketsError(null);
  };

  const openSoldTicketsModal = async (event: EventItem) => {
    try {
      closeActionMenu();
      setSelectedEventForSoldTickets(event);
      setLoadingSoldTickets(true);
      setSoldTicketsSearchTerm('');
      setOpeningSoldTicketInvoiceId(null);
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

  const handleOpenSoldTicketInvoice = async (stripePaymentIntentId: string) => {
    if (!stripePaymentIntentId) {
      setSoldTicketsError('Facture Stripe indisponible pour cette transaction.');
      return;
    }

    try {
      setOpeningSoldTicketInvoiceId(stripePaymentIntentId);
      setSoldTicketsError(null);
      const { hostedInvoiceUrl, invoicePdfUrl, receiptUrl } =
        await ticketService.getPaymentInvoiceLinks(stripePaymentIntentId);
      const invoiceUrl = hostedInvoiceUrl ?? invoicePdfUrl ?? receiptUrl;

      if (!invoiceUrl) {
        setSoldTicketsError('Facture Stripe indisponible pour cette transaction.');
        return;
      }

      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setSoldTicketsError('Impossible d’ouvrir la facture Stripe.');
    } finally {
      setOpeningSoldTicketInvoiceId(null);
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

      <EventFormModal
        isOpen={showForm}
        isEditing={Boolean(editingEventId)}
        formError={formError}
        submitting={submitting}
        categories={categories}
        title={title}
        description={description}
        categoryId={categoryId}
        location={location}
        address={address}
        startDate={startDate}
        endDate={endDate}
        imageUrl={imageUrl}
        status={status}
        ticketTypes={ticketTypes}
        onClose={resetForm}
        onSubmit={handleSubmit}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCategoryChange={setCategoryId}
        onLocationChange={setLocation}
        onAddressChange={setAddress}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onImageUrlChange={setImageUrl}
        onStatusChange={setStatus}
        onAddTicketType={addTicketTypeRow}
        onRemoveTicketType={removeTicketTypeRow}
        onUpdateTicketType={updateTicketTypeRow}
      />

      <EventCommentsModal
        isOpen={Boolean(selectedEventForComments)}
        eventTitle={selectedEventForComments?.title ?? ''}
        loadingComments={loadingComments}
        eventComments={eventComments}
        expandedComments={expandedComments}
        deletingCommentId={deletingCommentId}
        onClose={closeCommentsModal}
        onDeleteComment={handleDeleteComment}
        onToggleExpanded={toggleExpandedComment}
      />

      <EventSoldTicketsModal
        isOpen={Boolean(selectedEventForSoldTickets)}
        eventTitle={selectedEventForSoldTickets?.title ?? ''}
        loadingSoldTickets={loadingSoldTickets}
        soldTicketsError={soldTicketsError}
        soldTicketsSearchTerm={soldTicketsSearchTerm}
        hasSearchResults={groupedSoldTicketPurchases.length > 0}
        soldTicketPurchaseCards={soldTicketPurchaseCards}
        openingSoldTicketInvoiceId={openingSoldTicketInvoiceId}
        onClose={closeSoldTicketsModal}
        onSearchTermChange={setSoldTicketsSearchTerm}
        onOpenInvoice={(stripePaymentIntentId) => {
          void handleOpenSoldTicketInvoice(stripePaymentIntentId);
        }}
      />

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
          <UniformTable
            headers={[
              'Titre',
              'Categorie',
              'Lieu',
              'Debut',
              'Fin',
              'Types de ticket',
              'Tickets vendus',
              'Statut',
              'Commentaires',
              'Actions',
            ]}
          >
            {filteredEvents.map((event) => (
              <tr key={event.id} className="border-b border-white/10 transition-colors hover:bg-white/5">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-white">{event.title}</p>
                    <p className="text-xs text-gray-400">{event.id}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{event.category?.name || '-'}</td>
                <td className="px-6 py-4 text-gray-300">{event.location}</td>
                <td className="px-6 py-4 text-gray-300">{toLocalInputDateTime(event.start_date)}</td>
                <td className="px-6 py-4 text-gray-300">{toLocalInputDateTime(event.end_date)}</td>
                <td className="px-6 py-4 text-gray-300">{ticketTypeCountByEvent[event.id] || 0}</td>
                <td className="px-6 py-4 text-gray-300">{soldTicketCountByEvent[event.id] || 0}</td>
                <td className="px-6 py-4 text-gray-300">{statusLabels[event.status]}</td>
                <td className="px-6 py-4 text-gray-300">{commentCounts[event.id] || 0}</td>
                <td className="px-6 py-4">
                  <div className="relative inline-flex" data-action-menu-root="true">
                    <button
                      type="button"
                      onClick={(clickEvent: ReactMouseEvent<HTMLButtonElement>) => {
                        if (openActionMenuEventId === event.id) {
                          closeActionMenu();
                          return;
                        }
                        openActionMenu(event.id, clickEvent.currentTarget);
                      }}
                      disabled={deletingEventId === event.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-white disabled:opacity-50"
                      aria-expanded={openActionMenuEventId === event.id}
                      aria-haspopup="menu"
                    >
                      {deletingEventId === event.id ? 'Suppression...' : 'Actions'}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`h-4 w-4 transition-transform ${
                          openActionMenuEventId === event.id ? 'rotate-180' : ''
                        }`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                  </div>
                </td>
              </tr>
            ))}
          </UniformTable>
        )}
      </div>

      {activeActionEvent &&
        actionMenuPosition &&
        createPortal(
          <div
            data-action-menu-floating="true"
            className="fixed z-[130] w-64 rounded-xl border border-white/30 shadow-2xl overflow-hidden"
            style={{
              top: actionMenuPosition.top,
              left: actionMenuPosition.left,
              backgroundColor: '#1f5664',
              opacity: 1,
            }}
          >
            <button
              type="button"
              onClick={() => void openCommentsModal(activeActionEvent)}
              className="block w-full px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
            >
              Commentaires
            </button>
            <button
              type="button"
              onClick={() => {
                closeActionMenu();
                navigate(`/events/${activeActionEvent.id}`);
              }}
              className="block w-full px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
            >
              Voir
            </button>
            <button
              type="button"
              onClick={() => {
                closeActionMenu();
                void handleEdit(activeActionEvent);
              }}
              className="block w-full px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
            >
              Modifier
            </button>

            
              {hasSoldTicketsByEvent[activeActionEvent.id] ? (
                <button
                  type="button"
                  onClick={() => void openSoldTicketsModal(activeActionEvent)}
                  className="block w-full px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                >
                  Tickets
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleDelete(activeActionEvent.id)}
                  className="w-full text-left px-2 py-2 rounded-lg text-sm bg-red-500/35 hover:bg-red-500/45 text-red-100 transition-colors"
                >
                  Supprimer
                </button>
              )}
            
          </div>,
          document.body,
        )}
    </div>
  );
};

export default AdminEvents;