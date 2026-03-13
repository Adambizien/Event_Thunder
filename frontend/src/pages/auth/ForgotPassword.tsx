import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/AuthServices';
import Logo from '../../components/Logo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authService.forgotPassword(email);
      setMessage(response.message || 'Si l\'email existe, un lien de réinitialisation a été envoyé');
      setEmail('');
    } catch {
      setError('Une erreur s\'est produite. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy">
      <div className="w-full max-w-md px-6">
        <div className="card p-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          <h2 className="text-3xl font-bold text-center text-white mb-2">
            Mot de passe oublié
          </h2>
          <p className="text-center text-gray-300 mb-8">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>

          {message && (
            <div className="mb-4 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="Entrez votre email"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;