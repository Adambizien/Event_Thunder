import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/AuthServices';
import { PasswordInput } from '../../components/PasswordInput';
import { validatePassword, type PasswordValidation } from '../../utils/passwordValidator';
import Logo from '../../components/Logo';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const tokenParam = searchParams.get('token');
      if (!tokenParam) {
        setError('Lien de réinitialisation invalide');
        setIsTokenValid(false);
        setVerifying(false);
        return;
      }

      setToken(tokenParam);

      try {
        const result = await authService.verifyResetToken(tokenParam);
        if (!result.valid) {
          setError(result.message || 'Le jeton de réinitialisation est invalide ou a expiré');
          setIsTokenValid(false);
        } else {
          setIsTokenValid(true);
        }
      } catch {
        setError('Impossible de vérifier le jeton. Il est peut-être invalide ou a expiré.');
        setIsTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError('');
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    // Validate password
    const validation = validatePassword(formData.password);
    if (!validation.isValid) {
      setPasswordError(`Mot de passe invalide: ${validation.errors.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const response = await authService.resetPassword(token, formData.password);
      setMessage(response.message || 'Mot de passe réinitialisé avec succès');
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setPasswordError(errorMsg || 'Échec de la réinitialisation. Le lien a peut-être expiré.');
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

  if (!isTokenValid && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <Logo />
            </div>

            <div className="mb-6">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Lien invalide ou expiré
              </h2>
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 text-red-800 rounded-lg">
                <p className="font-semibold mb-2">Erreur :</p>
                <p className="text-sm">{error}</p>
              </div>
              <p className="text-gray-600 mb-6">
                Le lien de réinitialisation a peut-être expiré ou n'est plus valide.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="block w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 transition-all text-center"
              >
                Demander un nouveau lien
              </Link>
              <Link
                to="/login"
                className="block w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-all text-center"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Afficher le message de succès si la réinitialisation est complète
  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <Logo />
            </div>

            <div className="mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Mot de passe réinitialisé
              </h2>
              <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 text-green-800 rounded-lg">
                <p className="font-semibold text-lg">{message}</p>
              </div>
              <p className="text-gray-600 mb-6">
                Votre mot de passe a été changé avec succès. Vous allez être redirigé vers la page de connexion dans quelques secondes.
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 transition-all text-center"
            >
              Aller à la connexion
            </Link>
          </div>
        </div>
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

          {passwordError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {passwordError}
            </div>
          )}

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
