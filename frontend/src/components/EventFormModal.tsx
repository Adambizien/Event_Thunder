import type { FormEvent } from 'react';
import Modal from './Modal';
import type { EventCategory } from '../types/EventCategoryTypes';
import type { EventStatus } from '../types/EventTypes';
import type { TicketCurrency } from '../types/TicketTypes';

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

interface EventFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formError: string | null;
  submitting: boolean;
  categories: EventCategory[];
  title: string;
  description: string;
  categoryId: string;
  location: string;
  address: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  status: EventStatus;
  ticketTypes: TicketTypeFormItem[];
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onStatusChange: (value: EventStatus) => void;
  onAddTicketType: () => void;
  onRemoveTicketType: (index: number) => void;
  onUpdateTicketType: (index: number, patch: Partial<TicketTypeFormItem>) => void;
}

const statusOptions: EventStatus[] = ['draft', 'published', 'canceled', 'completed'];

const statusLabels: Record<EventStatus, string> = {
  draft: 'Brouillon',
  published: 'Publie',
  canceled: 'Annule',
  completed: 'Termine',
};

const EventFormModal = ({
  isOpen,
  isEditing,
  formError,
  submitting,
  categories,
  title,
  description,
  categoryId,
  location,
  address,
  startDate,
  endDate,
  imageUrl,
  status,
  ticketTypes,
  onClose,
  onSubmit,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onLocationChange,
  onAddressChange,
  onStartDateChange,
  onEndDateChange,
  onImageUrlChange,
  onStatusChange,
  onAddTicketType,
  onRemoveTicketType,
  onUpdateTicketType,
}: EventFormModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Modifier l'evenement" : 'Creer un nouvel evenement'}
      size="lg"
    >
      {formError && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300 mb-4">
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            placeholder="Ex: Conference Tech 2026"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
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
            onChange={(e) => onCategoryChange(e.target.value)}
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
            onChange={(e) => onStatusChange(e.target.value as EventStatus)}
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
            onChange={(e) => onLocationChange(e.target.value)}
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
            onChange={(e) => onAddressChange(e.target.value)}
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
            onChange={(e) => onStartDateChange(e.target.value)}
            required
            className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Date de fin</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            required
            className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">URL image (optionnel)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            placeholder="https://..."
          />
        </div>

        <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Billetterie</p>
              <p className="text-xs text-gray-400">Definissez les types de tickets vendus pour cet evenement</p>
            </div>
            <button
              type="button"
              onClick={onAddTicketType}
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
                    onClick={() => onUpdateTicketType(index, { isActive: !ticketType.isActive })}
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
                  onClick={() => onRemoveTicketType(index)}
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
                    onChange={(e) => onUpdateTicketType(index, { name: e.target.value })}
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
                    onChange={(e) => onUpdateTicketType(index, { price: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:border-thunder-gold focus:outline-none"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Devise</label>
                  <select
                    value={ticketType.currency}
                    onChange={(e) => onUpdateTicketType(index, { currency: e.target.value as TicketCurrency })}
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
                    onChange={(e) => onUpdateTicketType(index, { maxQuantity: e.target.value })}
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
                  onChange={(e) => onUpdateTicketType(index, { description: e.target.value })}
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
            {submitting ? 'Sauvegarde...' : isEditing ? "Modifier l'evenement" : "Creer l'evenement"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EventFormModal;