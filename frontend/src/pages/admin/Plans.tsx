import { useState, useEffect } from 'react';
import PlanFormModal from '../../components/PlanFormModal';
import type { Plan, FormData } from '../../types/PlanTypes';
import { planService } from '../../services/PlanService';
import AdminPageHeader from '../../components/AdminPageHeader';

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
    maxEvents: '0',
    maxPosts: '0',
    displayOrder: '0',
    description: '',
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await planService.fetchPlans();
      setPlans(data);
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
    if (isSubmitting) return;
    if (
      !formData.name ||
      !formData.price ||
      !formData.maxEvents ||
      !formData.maxPosts
    ) {
      setFormError('Veuillez remplir tous les champs');
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingId) {
        await planService.updatePlan(editingId, formData);
      } else {
        await planService.createPlan(formData);
      }
      setFormData({
        name: '',
        price: '',
        interval: 'monthly',
        currency: 'EUR',
        maxEvents: '0',
        maxPosts: '0',
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
      maxEvents: plan.maxEvents.toString(),
      maxPosts: plan.maxPosts.toString(),
      displayOrder: plan.displayOrder?.toString() ?? '0',
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
      await planService.deletePlan(id);
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
      maxEvents: '0',
      maxPosts: '0',
      displayOrder: '0',
      description: '',
    });
    setEditingId(null);
    setFormError(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
        <span className="spinner mr-2 align-middle"></span>
        Chargement des plans...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Gestion des plans"
        subtitle="Gérez les plans d'abonnement de votre service"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full md:w-auto bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Nouveau plan
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Modal Form */}
      <PlanFormModal
        isOpen={showForm}
        isEditing={Boolean(editingId)}
        formData={formData}
        formError={formError}
        isSubmitting={isSubmitting}
        onClose={resetForm}
        onSubmit={handleSubmit}
        onFormDataChange={setFormData}
      />

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
                className={`relative rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg transition-colors ${isDeleting ? 'opacity-60 grayscale pointer-events-none' : 'hover:border-thunder-gold/60'}`}
              >
                {isDeleting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-10 rounded-lg">
                    <span className="text-white text-xl font-bold mb-2">En cours de suppression...</span>
                    <span className="animate-spin text-3xl" aria-hidden="true"></span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-4">{plan.name}</h3>
                <div className="space-y-2 mb-4 text-gray-300">
                  <p>
                    <span className="text-gray-400">Prix:</span> {plan.price}
                    {plan.currency ?? 'EUR'}/{plan.interval === 'monthly' ? 'mois' : 'an'}
                  </p>
                  <p>
                    <span className="text-gray-400">Événements:</span>{' '}
                    {plan.maxEvents === -1 ? 'Illimité' : plan.maxEvents}
                  </p>
                  <p>
                    <span className="text-gray-400">Posts:</span>{' '}
                    {plan.maxPosts === -1 ? 'Illimité' : plan.maxPosts}
                  </p>
                  <p><span className="text-gray-400">Ordre:</span> {plan.displayOrder ?? 0}</p>
                  {plan.description && (
                    <p>
                      <span className="text-gray-400">Description:</span> {plan.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">Stripe: {plan.stripePriceId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white py-2 rounded transition-colors"
                    disabled={isDeleting}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/25 hover:bg-red-500/30 border border-red-500/50 text-red-200 py-2 rounded transition-colors"
                    disabled={isDeleting}
                  >
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
