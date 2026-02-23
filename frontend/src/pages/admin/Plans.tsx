import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  currency: string;
  stripe_price_id: string;
  max_events: number;
  display_order: number;
  description: string | null;
  created_at: string;
}

interface FormData {
  name: string;
  price: string;
  interval: 'monthly' | 'yearly';
  currency: 'EUR' | 'USD';
  maxEvents: string;
  displayOrder: string;
  description: string;
}

const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    interval: 'monthly',
    currency: 'EUR',
    maxEvents: '',
    displayOrder: '0',
    description: '',
  });
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchPlans();
  }, []); 
  
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/subscriptions/plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des plans');
      
      const data = await response.json();
      setPlans(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }
    
    if (!formData.name || !formData.price || !formData.maxEvents) {
      setFormError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        interval: formData.interval,
        currency: formData.currency,
        maxEvents: parseInt(formData.maxEvents),
        displayOrder: parseInt(formData.displayOrder),
        description: formData.description.trim() || null,
      };

      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId 
        ? `${apiUrl}/api/subscriptions/plans/${editingId}`
        : `${apiUrl}/api/subscriptions/plans`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

      setFormData({
        name: '',
        price: '',
        interval: 'monthly',
        currency: 'EUR',
        maxEvents: '',
        displayOrder: '0',
        description: '',
      });
      setEditingId(null);
      setShowForm(false);
      setFormError(null);
      fetchPlans();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      interval: plan.interval as 'monthly' | 'yearly',
      currency: (plan.currency || 'EUR') as 'EUR' | 'USD',
      maxEvents: plan.max_events.toString(),
      displayOrder: plan.display_order?.toString() ?? '0',
      description: plan.description ?? '',
    });
    setEditingId(plan.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plan ?')) return;
    setDeletingPlanId(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/subscriptions/plans/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      setError(null);
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setDeletingPlanId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      interval: 'monthly',
      currency: 'EUR',
      maxEvents: '',
      displayOrder: '0',
      description: '',
    });
    setEditingId(null);
    setFormError(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4 text-4xl">⚡</div>
          <p className="text-gray-400">Chargement des plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Gestion des plans</h1>
          <p className="text-gray-400">Gérez les plans d'abonnement de votre service</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-thunder-gold hover:bg-thunder-orange text-black font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
        >
          <span>➕</span>
          Nouveau plan
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingId ? 'Modifier le plan' : 'Créer un nouveau plan'}
        size="lg"
      >
        {formError && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400 mb-4">
            {formError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom du plan
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
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
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
                placeholder="9.99"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Intervalle
              </label>
              <select
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value as 'monthly' | 'yearly' })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currency: e.target.value as 'EUR' | 'USD',
                  })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
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
                onChange={(e) => setFormData({ ...formData, maxEvents: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
                placeholder="2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ordre d'affichage
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: e.target.value })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
                placeholder="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none min-h-[96px]"
                placeholder="Décrivez le plan (optionnel)"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-thunder-gold hover:bg-thunder-orange text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-thunder-gold"
            >
              {isSubmitting
                ? 'Sauvegarde...'
                : editingId
                ? 'Modifier'
                : 'Créer'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </Modal>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400 text-lg">Aucun plan trouvé</p>
          </div>
        ) : (
          plans.map((plan) => {
            const isDeleting = deletingPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative bg-gray-900 border border-gray-700 rounded-lg p-6 transition-colors ${isDeleting ? 'opacity-60 grayscale pointer-events-none' : 'hover:border-thunder-gold'}`}
              >
                {isDeleting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-10 rounded-lg">
                    <span className="text-white text-xl font-bold mb-2">En cours de suppression...</span>
                    <span className="animate-spin text-3xl">⚡</span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-4">{plan.name}</h3>
                <div className="space-y-2 mb-4 text-gray-300">
                  <p>
                    <span className="text-gray-400">Prix:</span> {plan.price}
                    {plan.currency ?? 'EUR'}/{plan.interval === 'monthly' ? 'mois' : 'an'}
                  </p>
                  <p><span className="text-gray-400">Événements:</span> {plan.max_events === -1 ? 'Illimité' : plan.max_events}</p>
                  <p><span className="text-gray-400">Ordre:</span> {plan.display_order ?? 0}</p>
                  {plan.description && (
                    <p>
                      <span className="text-gray-400">Description:</span> {plan.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Stripe: {plan.stripe_price_id}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors"
                    disabled={isDeleting}
                  >
                    <span>✏️</span>
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors"
                    disabled={isDeleting}
                  >
                    <span>🗑️</span>
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminPlans;
