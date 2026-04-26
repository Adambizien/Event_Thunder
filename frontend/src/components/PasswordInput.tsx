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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
          disabled={disabled}
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.05-2.7 3.1-4.9 5.68-6.2" />
              <path d="M1 1l22 22" />
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {showValidation && value && <PasswordValidationDisplay validation={validation} />}
    </div>
  );
};