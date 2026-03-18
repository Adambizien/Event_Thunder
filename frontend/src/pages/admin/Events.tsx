import { useEffect, useState } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';
import Modal from '../../components/Modal';
import { eventCategoryService } from '../../services/EventCategoryService';
import { eventService } from '../../services/EventService';
import type { EventCategory } from '../../types/EventCategoryTypes';
import type { CreateEventPayload, EventItem, EventStatus } from '../../types/EventTypes';

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

const AdminEvents = () => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [loadedCategories, loadedEvents] = await Promise.all([
        eventCategoryService.fetchCategories(),
        eventService.fetchEvents(),
      ]);

      setCategories(loadedCategories);
      setEvents(loadedEvents);
      if (!categoryId && loadedCategories.length > 0) {
        setCategoryId(loadedCategories[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setCategories([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInitialData();
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
    setEditingEventId(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleEdit = (event: EventItem) => {
    setTitle(event.title);
    setDescription(event.description);
    setCategoryId(event.category_id);
    setLocation(event.location);
    setAddress(event.address);
    setStartDate(toInputDateTimeValue(event.start_date));
    setEndDate(toInputDateTimeValue(event.end_date));
    setImageUrl(event.image_url || '');
    setStatus(event.status);
    setEditingEventId(event.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    try {
      setDeletingEventId(id);
      await eventService.deleteEvent(id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
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

      if (editingEventId) {
        const updatedEvent = await eventService.updateEvent(editingEventId, payload);
        setEvents((prev) =>
          prev.map((event) =>
            event.id === editingEventId ? updatedEvent : event,
          ),
        );
        setSuccess("L'événement a été modifié avec succès");
      } else {
        const createdEvent = await eventService.createEvent(payload);
        setEvents((prev) => [createdEvent, ...prev]);
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
      return searchWords.every((word) => haystack.includes(word));
    })
    .sort((first, second) => {
      const firstTime = new Date(first.start_date).getTime();
      const secondTime = new Date(second.start_date).getTime();
      const compared = firstTime - secondTime;
      return sortOrder === 'asc' ? compared : -compared;
    });

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
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
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(event)}
                          className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2 rounded transition-colors"
                          disabled={deletingEventId === event.id}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="bg-red-500/25 hover:bg-red-500/30 border border-red-500/50 text-red-200 px-4 py-2 rounded transition-colors"
                          disabled={deletingEventId === event.id}
                        >
                          {deletingEventId === event.id ? 'Suppression...' : 'Supprimer'}
                        </button>
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