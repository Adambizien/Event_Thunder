import { useState } from 'react';
import { validatePassword, type PasswordValidation } from '../utils/passwordValidator';
import { PasswordValidationDisplay } from './PasswordValidationDisplay';

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (validation: PasswordValidation) => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  showValidation?: boolean;
  required?: boolean;
}

export const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  onValueChange,
  placeholder = 'Entrez le mot de passe',
  label = 'Mot de passe',
  disabled = false,
  showValidation = true,
  required = true,
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const validation = validatePassword(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onValueChange(newValue);
    onChange(validatePassword(newValue));
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-300 mb-2">
          {label} {required ? <span className="text-red-300">*</span> : null}
        </label>
      )}
      
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          className="input-field"
          placeholder={placeholder}
        />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-3 text-xs font-semibold uppercase tracking-wide text-gray-300 hover:text-white"
          disabled={disabled}
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? 'Masquer' : 'Voir'}
        </button>
      </div>

      {showValidation && value && <PasswordValidationDisplay validation={validation} />}
    </div>
  );
};