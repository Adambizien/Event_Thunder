import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/AuthServices';
import GoogleAuthButton from './GoogleAuthButton';
import Logo from './Logo';
import type { User } from '../types/AuthTypes';

interface LoginProps {
  onSwitchToRegister: () => void;
  onLogin: (user: User) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  type ApiError = { response?: { data?: { message?: string } } };
  const getErrorMessage = (err: unknown) => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const maybeResponse = (err as ApiError).response;
      const message = maybeResponse?.data?.message;
      if (typeof message === 'string') return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return 'Login failed. Please check your credentials and try again.';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      onLogin(response.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (user: User) => {
    onLogin(user);
    navigate('/dashboard');
  };

  const handleGoogleError = (error: string) => {
    setError(error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <Logo size="md" />
          </div>
          <p className="text-gray-300 text-lg">Bienvenue</p>
          <p className="text-gray-400 text-sm">Connectez-vous à votre compte</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-box mb-6">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-700 hover:text-red-900 font-bold text-lg leading-none"
              aria-label="Close error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Card */}
        <div className="card p-8 mb-6">
          {/* Google Auth Button */}
          <GoogleAuthButton 
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            buttonText="Continuer avec Google"
          />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-600">ou avec l'email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adresse e-mail
              </label>
              <input
                type="email"
                name="email"
                placeholder="Entrez votre e-mail"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="input-field"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Mot de passe
                </label>
                <button 
                  type="button" 
                  className="text-sm font-semibold text-thunder-gold hover:text-thunder-orange transition-colors"
                >
                  Mot de passe oublié?
                </button>
              </div>
              <input
                type="password"
                name="password"
                placeholder="Entrez votre mot de passe"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                className="input-field"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary mt-6 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Connexion en cours...
                </>
              ) : (
                'Se connecter à votre compte'
              )}
            </button>

            <div className="mt-4 text-center">
              <Link 
                to="/forgot-password"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Mot de passe oublié?
              </Link>
            </div>
          </form>
        </div>

        {/* Sign Up Link */}
        <div className="text-center py-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Vous n'avez pas de compte?{' '}
            <Link 
              to="/register"
              className="btn-secondary ml-1"
            >
              S'inscrire
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-xs leading-relaxed">
            En continuant, vous acceptez nos Conditions de service et notre Politique de confidentialité.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;