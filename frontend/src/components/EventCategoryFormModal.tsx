import type { FormEvent } from 'react';
import Modal from './Modal';

interface EventCategoryFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  name: string;
  formError: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onNameChange: (value: string) => void;
}

const EventCategoryFormModal = ({
  isOpen,
  isEditing,
  name,
  formError,
  submitting,
  onClose,
  onSubmit,
  onNameChange,
}: EventCategoryFormModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifier la catégorie' : 'Créer une nouvelle catégorie'}
      size="md"
    >
      {formError && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300 mb-4">
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nom de la catégorie
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            placeholder="Ex: Conférence"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/15"
          >
            {submitting
              ? 'Sauvegarde...'
              : isEditing
              ? 'Modifier la catégorie'
              : 'Créer la catégorie'}
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

export default EventCategoryFormModal;