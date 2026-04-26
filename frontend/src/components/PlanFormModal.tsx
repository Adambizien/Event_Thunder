import type { FormEvent } from 'react';
import Modal from './Modal';
import type { FormData } from '../types/PlanTypes';

interface PlanFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: FormData;
  formError: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onFormDataChange: (nextFormData: FormData) => void;
}

const PlanFormModal = ({
  isOpen,
  isEditing,
  formData,
  formError,
  isSubmitting,
  onClose,
  onSubmit,
  onFormDataChange,
}: PlanFormModalProps) => {
  const updateFormData = <K extends keyof FormData>(
    key: K,
    value: FormData[K],
  ) => {
    onFormDataChange({ ...formData, [key]: value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifier le plan' : 'Créer un nouveau plan'}
      size="lg"
    >
      {formError && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300 mb-4">
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom du plan
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="Ex: Pro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prix (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => updateFormData('price', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="9.99"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Intervalle
            </label>
            <select
              value={formData.interval}
              onChange={(e) =>
                updateFormData('interval', e.target.value as 'monthly' | 'yearly')
              }
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="monthly">Mensuel</option>
              <option value="yearly">Annuel</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Devise
            </label>
            <select
              value={formData.currency}
              onChange={(e) => updateFormData('currency', e.target.value as 'EUR' | 'USD')}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Événements max (-1 = illimité)
            </label>
            <input
              type="number"
              value={formData.maxEvents}
              onChange={(e) => updateFormData('maxEvents', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Posts max (-1 = illimité)
            </label>
            <input
              type="number"
              value={formData.maxPosts}
              onChange={(e) => updateFormData('maxPosts', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ordre d'affichage
            </label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={(e) => updateFormData('displayOrder', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="0"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none min-h-[96px]"
              placeholder="Décrivez le plan (optionnel)"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/15"
          >
            {isSubmitting ? 'Sauvegarde...' : isEditing ? 'Modifier' : 'Créer'}
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

export default PlanFormModal;