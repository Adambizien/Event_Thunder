import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/AuthServices';
import GoogleAuthButton from '../../components/GoogleAuthButton';
import Logo from '../../components/Logo';
import { PasswordInput } from '../../components/PasswordInput';
import { validatePassword, type PasswordValidation } from '../../utils/passwordValidator';
import type { User } from '../../types/AuthTypes';

interface RegisterProps {
  onSwitchToLogin: () => void;
  onRegister: (user: User) => void;
}

const Register = ({ onRegister }: RegisterProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

  type ApiError = { response?: { data?: { message?: string } } };
  const getErrorMessage = (err: unknown) => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const maybeResponse = (err as ApiError).response;
      const message = maybeResponse?.data?.message;
      if (typeof message === 'string') return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return 'Registration failed. Please try again.';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    const validation = validatePassword(formData.password);
    if (!validation.isValid) {
      setError(`Mot de passe invalide: ${validation.errors.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const response = await authService.register(formData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      onRegister(response.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
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
          <p className="text-gray-300 text-lg">Créer un compte</p>
          <p className="text-gray-400 text-sm">Inscrivez-vous pour commencer</p>
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
          {/* Required Fields Note */}
          <p className="text-gray-500 text-xs mb-4">
            Les champs marqués <span className="text-red-600 font-bold">*</span> sont obligatoires.
          </p>
          {/* Google Auth Button */}
          <GoogleAuthButton 
            onError={handleGoogleError}
            buttonText="S'inscrire avec Google"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prénom <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Votre prénom"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Votre nom"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Numéro de téléphone <span className="text-gray-500">(optionnel)</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="Votre numéro de téléphone"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={loading}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adresse e-mail <span className="text-red-600">*</span>
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
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={setPasswordValidation}
                onValueChange={(password) => {
                  setFormData({
                    ...formData,
                    password
                  });
                }}
                placeholder="Créez un mot de passe"
                label="Mot de passe"
                disabled={loading}
                showValidation={true}
                required={true}
              />
            </div>

            <div>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={() => {}} // No validation needed for confirm password
                onValueChange={(confirmPassword) => {
                  setFormData({
                    ...formData,
                    confirmPassword
                  });
                }}
                placeholder="Confirmez votre mot de passe"
                label="Confirmer le mot de passe"
                disabled={loading}
                showValidation={false}
                required={true}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !passwordValidation?.isValid}
              className="btn-primary mt-6 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Création du compte...
                </>
              ) : (
                'Créer un compte'
              )}
            </button>
          </form>
        </div>

        {/* Sign In Link */}
        <div className="text-center py-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Vous avez déjà un compte?{' '}
            <Link 
              to="/login"
              className={`ml-1 ${loading ? 'opacity-50 cursor-not-allowed' : 'btn-secondary'}`}
              onClick={(e) => loading && e.preventDefault()}
            >
              Se connecter
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

export default Register;