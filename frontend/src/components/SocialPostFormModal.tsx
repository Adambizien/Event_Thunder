import type { FormEvent } from 'react';
import type { EventItem } from '../types/EventTypes';
import type { SocialNetwork } from '../types/PostTypes';
import Modal from './Modal';

type SocialPostFormModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  events: EventItem[];
  postMode: 'draft' | 'scheduled';
  content: string;
  eventId: string;
  scheduledAt: string;
  selectedNetworks: SocialNetwork[];
  submitting: boolean;
  generatingText: boolean;
  aiPrompt: string;
  aiFeedback: string | null;
  aiFeedbackType: 'success' | 'error' | null;
  formError: string | null;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onGenerateText: () => void;
  onContentChange: (value: string) => void;
  onAiPromptChange: (value: string) => void;
  onEventIdChange: (value: string) => void;
  onPostModeChange: (value: 'draft' | 'scheduled') => void;
  onScheduledAtChange: (value: string) => void;
  onNetworksChange: (networks: SocialNetwork[]) => void;
};

const SocialPostFormModal = ({
  isOpen,
  isEditing,
  events,
  postMode,
  content,
  eventId,
  scheduledAt,
  selectedNetworks,
  submitting,
  generatingText,
  aiPrompt,
  aiFeedback,
  aiFeedbackType,
  formError,
  onClose,
  onSubmit,
  onGenerateText,
  onContentChange,
  onAiPromptChange,
  onEventIdChange,
  onPostModeChange,
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
          <label className="mb-2 block text-sm font-medium text-gray-300">Statut</label>
          <select
            value={postMode}
            onChange={(e) => onPostModeChange(e.target.value as 'draft' | 'scheduled')}
            className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
          >
            <option value="draft" className="bg-thunder-dark text-white">
              Brouillon
            </option>
            <option value="scheduled" className="bg-thunder-dark text-white">
              Programme
            </option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            En brouillon, aucun e-mail de confirmation n'est envoyé
          </p>
        </div>

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

        <div className="rounded-xl border border-white/15 bg-black/20 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-gray-300">Assistant IA (groq)</label>
            <button
              type="button"
              onClick={onGenerateText}
              disabled={generatingText || submitting}
              className="rounded-md border border-thunder-gold/50 bg-thunder-gold/20 px-3 py-1.5 text-xs font-semibold text-thunder-gold transition hover:bg-thunder-gold/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingText ? 'Generation...' : 'Generer le texte'}
            </button>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => onAiPromptChange(e.target.value)}
            placeholder="Ex: Écris un post engageant pour promouvoir mon événement selectionné, en mettant en avant les points forts et en incitant les gens à s'inscrire."
            rows={3}
            maxLength={1200}
            className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-thunder-gold focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">{aiPrompt.length}/1200</p>
          {aiFeedback && (
            <p
              className={`mt-2 text-xs ${
                aiFeedbackType === 'error' ? 'text-red-300' : 'text-emerald-300'
              }`}
            >
              {aiFeedback}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Événement (optionnel)
          </label>
          <select
            value={eventId}
            onChange={(e) => onEventIdChange(e.target.value)}
            className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
          >
            <option value="" className="bg-thunder-dark text-white">
              Aucun événement
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

        {postMode === 'scheduled' && (
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
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Réseaux sociaux</label>
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
              : postMode === 'draft'
              ? 'Enregistrer le brouillon'
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
