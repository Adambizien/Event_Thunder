import type { PasswordValidation } from "../utils/passwordValidator";

interface PasswordValidationDisplayProps {
  validation: PasswordValidation | null;
  showWhenEmpty?: boolean;
}

export const PasswordValidationDisplay = ({ 
  validation, 
  showWhenEmpty = false 
}: PasswordValidationDisplayProps) => {
  if (!validation && !showWhenEmpty) return null;

  return (
    <div className="mt-3 p-4 bg-white/5 rounded-lg border border-white/10">
      <p className="text-sm font-semibold text-gray-200 mb-3">Critères de sécurité:</p>
      <div className="space-y-2">
        <div className={`flex items-center gap-2 text-sm ${validation?.criteria.minLength ? 'text-green-300' : 'text-gray-400'}`}>
          <span>{validation?.criteria.minLength ? '✓' : '○'}</span>
          <span>Minimum 12 caractères</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${validation?.criteria.hasLowercase ? 'text-green-300' : 'text-gray-400'}`}>
          <span>{validation?.criteria.hasLowercase ? '✓' : '○'}</span>
          <span>Au moins 1 lettre minuscule</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${validation?.criteria.hasUppercase ? 'text-green-300' : 'text-gray-400'}`}>
          <span>{validation?.criteria.hasUppercase ? '✓' : '○'}</span>
          <span>Au moins 1 lettre majuscule</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${validation?.criteria.hasNumber ? 'text-green-300' : 'text-gray-400'}`}>
          <span>{validation?.criteria.hasNumber ? '✓' : '○'}</span>
          <span>Au moins 1 chiffre</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${validation?.criteria.hasSpecialChar ? 'text-green-300' : 'text-gray-400'}`}>
          <span>{validation?.criteria.hasSpecialChar ? '✓' : '○'}</span>
          <span>Au moins 1 caractère spécial (@$!%*?&)</span>
        </div>
      </div>
    </div>
  );
};