import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import { eventCategoryService } from '../../services/EventCategoryService';
import { eventService } from '../../services/EventService';
import { subscriptionService } from '../../services/SubscriptionService';
import type { User } from '../../types/AuthTypes';
import type { EventCategory } from '../../types/EventCategoryTypes';
import type { CreateEventPayload, EventStatus } from '../../types/EventTypes';
import { formatCountdown, getOrganizerAccessState } from '../../utils/subscriptionAccess';

interface OrganizerCreateEventProps {
  user: User;
}

const toIsoDateString = (value: string): string | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const OrganizerCreateEvent = ({ user }: OrganizerCreateEventProps) => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(Boolean(user.planId));
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [gracePeriodEnd, setGracePeriodEnd] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');

  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccess = async () => {
      if (!user.id) {
        setHasActiveSubscription(false);
        setLoadingAccess(false);
        return;
      }

      try {
        const subscriptions = await subscriptionService.getUserSubscriptions(user.id);
        const accèssState = getOrganizerAccessState(subscriptions);
        setHasActiveSubscription(accèssState.hasAccess || Boolean(user.planId));
        setIsGracePeriod(accèssState.isGracePeriod);
        setGracePeriodEnd(accèssState.gracePeriodEnd);
      } catch {
        setHasActiveSubscription(Boolean(user.planId));
        setIsGracePeriod(false);
        setGracePeriodEnd(null);
      } finally {
        setLoadingAccess(false);
      }
    };

    void fetchAccess();
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

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const loadedCategories = await eventCategoryService.fetchCategories();
        setCategories(loadedCategories);
        if (loadedCategories.length > 0) {
          setCategoryId((prev) => prev || loadedCategories[0].id);
        }
      } catch {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    void fetchCategories();
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
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!hasActiveSubscription) {
      setFormError("Vous devez avoir un abonnement actif pour créer un événement.");
      return;
    }

    const startIso = toIsoDateString(startDate);
    const endIso = toIsoDateString(endDate);

    if (!startIso || !endIso) {
      setFormError('Veuillez saisir des dates valides.');
      return;
    }

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setFormError('La date de fin doit être postérieure à la date de début.');
      return;
    }

    if (!categoryId) {
      setFormError('Veuillez choisir une catégorie.');
      return;
    }

    const payload: CreateEventPayload = {
      creator_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId,
      location: location.trim(),
      address: address.trim(),
      start_date: startIso,
      end_date: endIso,
      image_url: imageUrl.trim() || undefined,
      status,
    };

    try {
      setSubmitting(true);
      await eventService.createEvent(payload);
      setSuccess('Événement créé avec succès.');
      resetForm();
    } catch {
      setFormError("Erreur lors de la création de l'événement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAccess) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
        Vérification de votre abonnement...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Création d'événement"
        subtitle="Publiéz votre prochain événement depuis votre espace organisateur"
      />

      {isGracePeriod && gracePeriodEnd && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/15 p-6 shadow-2xl backdrop-blur-lg">
          <h2 className="text-lg font-bold text-amber-200">Abonnement annule: accès temporaire</h2>
          <p className="mt-2 text-amber-100/90">
            Vous ne serez bientôt plus abonné et devrez renouveler l'abonnement, mais vous gardez l'accès à la création d'événement pour l'instant.
          </p>
          <p className="mt-3 font-mono text-xl text-amber-100">
            {formatCountdown(gracePeriodEnd, nowMs)}
          </p>
          <p className="mt-2 text-sm text-amber-100/80">
            Fin de période: {new Date(gracePeriodEnd).toLocaleString('fr-FR')}
          </p>
        </div>
      )}

      {!hasActiveSubscription ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/15 p-6 shadow-2xl backdrop-blur-lg">
          <h2 className="text-xl font-bold text-amber-200">Abonnement requis</h2>
          <p className="mt-2 text-amber-100/90">
            Vous devez être abonné à un plan actif pour accéder à la création d'événement.
          </p>
          <Link
            to="/subscription"
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-thunder-gold/40 px-4 py-2 font-semibold text-thunder-gold transition-colors hover:bg-thunder-gold hover:text-black"
          >
            Voir les plans et s'abonner
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          {formError && (
            <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
              {formError}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-4 text-emerald-200">
              {success}
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
                placeholder="Décrivez votre événement"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                disabled={loadingCategories || categories.length === 0}
                className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              >
                {categories.length === 0 && <option value="">Aucune catégorie disponible</option>}
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
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Date de début</label>
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

            <div className="md:col-span-2 pt-4">
              <button
                type="submit"
                disabled={submitting || categories.length === 0 || loadingCategories}
                className="w-full bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Création en cours...' : "Créer l'événement"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrganizerCreateEvent;
