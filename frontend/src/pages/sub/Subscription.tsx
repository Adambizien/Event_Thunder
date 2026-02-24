import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { authService } from '../../services/AuthServices';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description?: string;
}

const Subscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState<null | string>(null);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/api/subscriptions/plans`);
        if (!response.ok) throw new Error('Erreur lors du chargement des plans');
        const data = await response.json();
        setPlans(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError('Impossible de charger les plans');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
    const token = localStorage.getItem('token');
    setIsLogged(!!token);
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!isLogged) {
      setShowAuthChoice(planId);
      return;
    }
    setSubscribing(planId);
    try {
      const token = localStorage.getItem('token');
      const successUrl = `${window.location.origin}/subscription?success=1`;
      const cancelUrl = `${window.location.origin}/subscription?canceled=1`;
      const user = authService.getStoredUser();
      const userId = user?.id;
      const customerEmail = user?.email;
      const response = await fetch(`${apiUrl}/api/subscriptions/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, planId, successUrl, cancelUrl, customerEmail }),
      });
      if (!response.ok) throw new Error('Erreur lors de la création de la session');
      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      setError('Erreur lors de la souscription');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Chargement des plans...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Choisissez votre abonnement</h1>
      <div className="grid md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2 text-white">{plan.name}</h2>
            <div className="text-3xl font-bold text-thunder-gold mb-2">
              {plan.price} {plan.currency} / {plan.interval === 'monthly' ? 'mois' : 'an'}
            </div>
            {plan.description && <p className="text-gray-400 mb-4 text-center">{plan.description}</p>}
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={!!subscribing}
              className="mt-auto px-6 py-2 bg-thunder-gold text-black font-semibold rounded hover:bg-thunder-orange transition-colors disabled:opacity-60"
            >
              {subscribing === plan.id ? 'Redirection...' : 'S’abonner'}
            </button>
          </div>
        ))}
      </div>

      {/* Modal choix inscription/connexion */}
      <Modal
        isOpen={!!showAuthChoice}
        onClose={() => setShowAuthChoice(null)}
        title="Avez-vous déjà un compte ?"
        size="sm"
      >
        <div className="flex flex-col gap-4 items-center">
          <button
            className="px-6 py-2 bg-thunder-gold text-black font-semibold rounded hover:bg-thunder-orange transition-colors w-full"
            onClick={() => {
              setShowAuthChoice(null);
              navigate('/login?redirect=subscription');
            }}
          >
            Oui, j'ai déjà un compte
          </button>
          <button
            className="px-6 py-2 bg-gray-700 text-white font-semibold rounded hover:bg-thunder-gold hover:text-black transition-colors w-full"
            onClick={() => {
              setShowAuthChoice(null);
              navigate('/register?redirect=subscription');
            }}
          >
            Non, je veux m'inscrire
          </button>
          <button
            className="mt-2 text-gray-400 hover:text-white text-sm underline"
            onClick={() => setShowAuthChoice(null)}
          >
            Annuler
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Subscription;
