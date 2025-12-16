import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/AuthServices';
import GoogleAuthButton from './GoogleAuthButton';
import type { User } from '../types/AuthTypes';

interface RegisterProps {
  onSwitchToLogin: () => void;
  onRegister: (user: User) => void;
}

const Register = ({ onRegister }: RegisterProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const response = await authService.register(formData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      onRegister(response.user);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (user: User) => {
    onRegister(user);
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
          <h1 className="text-5xl font-black text-thunder-gold mb-2">
            ⚡
          </h1>
          <h2 className="text-3xl font-black text-thunder-yellow mb-2">
            EVENT THUNDER
          </h2>
          <p className="text-gray-300 text-lg">Create Account</p>
          <p className="text-gray-400 text-sm">Sign up to get started</p>
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
            buttonText="Sign up with Google"
          />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-600">or with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                disabled={loading}
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-2">Must be at least 6 characters</p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary mt-6 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating account...
                </>
              ) : (
                'Create Account'
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
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;