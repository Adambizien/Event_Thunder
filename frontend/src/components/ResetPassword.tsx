import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/AuthServices';
import { PasswordInput } from './PasswordInput';
import { validatePassword, type PasswordValidation } from '../utils/passwordValidator';
import Logo from './Logo';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const tokenParam = searchParams.get('token');
      if (!tokenParam) {
        setError('Lien de réinitialisation invalide');
        setVerifying(false);
        return;
      }

      setToken(tokenParam);

      try {
        const result = await authService.verifyResetToken(tokenParam);
        if (!result.valid) {
          setError(result.message || 'Le jeton de réinitialisation est invalide ou a expiré');
        }
      } catch {
        setError('Impossible de vérifier le jeton. Il est peut-être invalide ou expiré.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    // Validate password
    const validation = validatePassword(formData.password);
    if (!validation.isValid) {
      setError(`Mot de passe invalide: ${validation.errors.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const response = await authService.resetPassword(token, formData.password);
      setMessage(response.message || 'Mot de passe réinitialisé avec succès');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(errorMsg || 'Échec de la réinitialisation. Le lien a peut-être expiré.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Vérification du lien...</p>
        </div>
      </div>
    );
  }

  if (!token && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md px-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Réinitialiser le mot de passe
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Entrez votre nouveau mot de passe
          </p>

          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {!error && token && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={setPasswordValidation}
                onValueChange={(password) => {
                  setFormData({
                    ...formData,
                    password,
                  });
                }}
                placeholder="Entrez le nouveau mot de passe"
                label="Nouveau mot de passe"
                disabled={loading}
                showValidation={true}
                required={true}
              />

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={() => {}} // No validation needed for confirm password
                onValueChange={(confirmPassword) => {
                  setFormData({
                    ...formData,
                    confirmPassword,
                  });
                }}
                placeholder="Confirmez le nouveau mot de passe"
                label="Confirmer le mot de passe"
                disabled={loading}
                showValidation={false}
                required={true}
              />

              <button
                type="submit"
                disabled={loading || !passwordValidation?.isValid}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
