import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { authService, userService } from '../services/AuthServices';
import type { User } from '../types/AuthTypes';
import { PasswordInput } from './PasswordInput';
import { PasswordValidationDisplay } from './PasswordValidationDisplay';
import { validatePassword, type PasswordValidation } from '../utils/passwordValidator';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

const Profile = ({ user, onUpdate, onLogout }: ProfileProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

  useEffect(() => {
    if (formData.newPassword) {
      const validation = validatePassword(formData.newPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [formData.newPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Phone number validation (optional field)
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phone = formData.phoneNumber.trim();
      const phoneRegex = /^(?:\+?\d{7,15}|0\d{9})$/; // E.164-like or French local
      if (!phoneRegex.test(phone)) {
        newErrors.phoneNumber = 'Format de numéro de téléphone invalide';
      }
    }

    if (isPasswordMode) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Le mot de passe actuel est requis';
      }

      if (!formData.newPassword) {
        newErrors.newPassword = 'Le nouveau mot de passe est requis';
      } else if (!passwordValidation?.isValid) {
        newErrors.newPassword = 'Le mot de passe ne respecte pas tous les critères';
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isPasswordMode) {
        // Update password
        await userService.updatePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });
        
        // Logout immediately after password change
        await authService.logout();
        onLogout(); // Update React state
        navigate('/login');
      } else {
        // Update profile info
        const response = await userService.updateProfile({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber.trim() || undefined,
        });
        
        // Update local storage and state
        const updatedUser = response.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        onUpdate(updatedUser);
        setSuccessMessage('Profil mis à jour avec succès');
      }
    } catch (error: unknown) {
      let errorMessage = 'Une erreur est survenue';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-thunder-gold mb-2">Mon Profil</h1>
            <p className="text-gray-300">Gérez vos informations personnelles</p>
            <p className="text-sm text-gray-400 mb-4">
                Les champs marqués <span className="text-red-400">*</span> sont obligatoires
            </p>
          </div>

          {/* Toggle between profile and password mode */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setIsPasswordMode(false)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                !isPasswordMode
                  ? 'bg-thunder-gold text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Informations personnelles
            </button>
            <button
              type="button"
              onClick={() => setIsPasswordMode(true)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                isPasswordMode
                  ? 'bg-thunder-gold text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Changer le mot de passe
            </button>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          )}

          {errors.submit && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isPasswordMode ? (
              <>
                
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-200 mb-2">
                    Prénom <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/10 border ${
                      errors.firstName ? 'border-red-500' : 'border-white/20'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-thunder-gold transition-colors`}
                    placeholder="Votre prénom"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-200 mb-2">
                    Nom <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/10 border ${
                      errors.lastName ? 'border-red-500' : 'border-white/20'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-thunder-gold transition-colors`}
                    placeholder="Votre nom"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-200 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/10 border ${
                      errors.email ? 'border-red-500' : 'border-white/20'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-thunder-gold transition-colors`}
                    placeholder="votre@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-200 mb-2">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/10 border ${
                      errors.phoneNumber ? 'border-red-500' : 'border-white/20'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-thunder-gold transition-colors`}
                    placeholder="+33 6 12 34 56 78"
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-400">{errors.phoneNumber}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Current Password */}
                <div>
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currentPassword: value }))}
                    onChange={() => { }}
                    placeholder="Votre mot de passe actuel"
                    label="Mot de passe actuel"
                    showValidation={false}
                  />
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.currentPassword}</p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={setPasswordValidation}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, newPassword: value }))}
                    placeholder="Votre nouveau mot de passe"
                    label="Nouveau mot de passe"
                    showValidation={false}
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.newPassword}</p>
                  )}
                  {formData.newPassword && (
                    <div className="mt-3">
                      <PasswordValidationDisplay validation={passwordValidation} />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, confirmPassword: value }))}
                    onChange={() => { }}
                    placeholder="Confirmez votre nouveau mot de passe"
                    label="Confirmer le nouveau mot de passe"
                    showValidation={false}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 px-6 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading || (isPasswordMode && passwordValidation !== null && !passwordValidation.isValid)}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  isLoading || (isPasswordMode && passwordValidation !== null && !passwordValidation.isValid)
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-thunder-gold text-black hover:bg-thunder-orange'
                }`}
              >
                {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
