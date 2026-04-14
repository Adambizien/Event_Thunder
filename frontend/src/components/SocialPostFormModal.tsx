import type { FormEvent } from 'react';
import type { EventItem } from '../types/EventTypes';
import type { SocialNetwork } from '../types/PostTypes';
import Modal from './Modal';

type SocialPostFormModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  events: EventItem[];
  content: string;
  eventId: string;
  scheduledAt: string;
  selectedNetworks: SocialNetwork[];
  submitting: boolean;
  formError: string | null;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onContentChange: (value: string) => void;
  onEventIdChange: (value: string) => void;
  onScheduledAtChange: (value: string) => void;
  onNetworksChange: (networks: SocialNetwork[]) => void;
};

const SocialPostFormModal = ({
  isOpen,
  isEditing,
  events,
  content,
  eventId,
  scheduledAt,
  selectedNetworks,
  submitting,
  formError,
  onClose,
  onSubmit,
  onContentChange,
  onEventIdChange,
  onScheduledAtChange,
  onNetworksChange,
}: SocialPostFormModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifier un post' : 'Créer un post programmé'}
      size="md"
    >
      {formError && (
        <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Contenu</label>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Ecris ton post ici..."
            maxLength={5000}
            rows={5}
            className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white placeholder:text-gray-400 focus:border-thunder-gold focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">{content.length}/5000</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Evenement (optionnel)
          </label>
          <select
            value={eventId}
            onChange={(e) => onEventIdChange(e.target.value)}
            className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
          >
            <option value="" className="bg-thunder-dark text-white">
              Aucun evenement
            </option>
            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
                className="bg-thunder-dark text-white"
              >
                {event.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Date de planification
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => onScheduledAtChange(e.target.value)}
            className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Reseau</label>
          <label className="inline-flex items-center gap-2 rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={selectedNetworks.includes('x')}
              onChange={(e) => {
                if (e.target.checked) {
                  onNetworksChange(['x']);
                } else {
                  onNetworksChange([]);
                }
              }}
            />
            X
          </label>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg border border-white/30 bg-white/15 py-3 font-semibold text-white transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/15"
          >
            {submitting
              ? 'Sauvegarde...'
              : isEditing
              ? 'Modifier le post'
              : 'Programmer le post'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/30 bg-white/15 py-3 font-semibold text-white transition-colors hover:bg-white/25"
          >
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SocialPostFormModal;
