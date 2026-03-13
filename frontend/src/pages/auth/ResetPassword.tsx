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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
          <span className="spinner mr-2 align-middle"></span>
          Vérification du lien...
        </div>
      </div>
    );
  }

  if (!token && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
          Chargement...
        </div>
      </div>
    );
  }

  if (!isTokenValid && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="flex justify-center mb-6">
              <Logo />
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-4">
                Lien invalide ou expiré
              </h2>
              <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
                <p className="font-semibold mb-2">Erreur :</p>
                <p className="text-sm">{error}</p>
              </div>
              <p className="text-gray-300 mb-6">
                Le lien de réinitialisation a peut-être expiré ou n'est plus valide.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="block w-full bg-thunder-gold text-black py-3 px-4 rounded-lg font-semibold hover:bg-thunder-orange transition-colors text-center"
              >
                Demander un nouveau lien
              </Link>
              <Link
                to="/login"
                className="block w-full bg-white/10 border border-white/20 text-white py-3 px-4 rounded-lg font-semibold hover:bg-white/20 transition-colors text-center"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="flex justify-center mb-6">
              <Logo />
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-4">
                Mot de passe réinitialisé
              </h2>
              <div className="mb-6 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-300">
                <p className="font-semibold text-lg">{message}</p>
              </div>
              <p className="text-gray-300 mb-6">
                Votre mot de passe a été changé avec succès. Vous allez être redirigé vers la page de connexion dans quelques secondes.
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full bg-thunder-gold text-black py-3 px-4 rounded-lg font-semibold hover:bg-thunder-orange transition-colors text-center"
            >
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy">
      <div className="w-full max-w-md px-6">
        <div className="card p-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          <h2 className="text-3xl font-bold text-center text-white mb-2">
            Réinitialiser le mot de passe
          </h2>
          <p className="text-center text-gray-300 mb-8">
            Entrez votre nouveau mot de passe
          </p>

          {passwordError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
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
              onChange={() => {}}
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
              className="btn-primary"
            >
              {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
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

export default ResetPassword;