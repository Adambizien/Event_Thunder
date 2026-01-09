export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  criteria: {
    minLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export const validatePassword = (password: string): PasswordValidation => {
  const criteria = {
    minLength: password.length >= 12,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password),
  };

  const errors: string[] = [];

  if (!criteria.minLength) {
    errors.push('Au moins 12 caractères');
  }
  if (!criteria.hasLowercase) {
    errors.push('Au moins 1 lettre minuscule');
  }
  if (!criteria.hasUppercase) {
    errors.push('Au moins 1 lettre majuscule');
  }
  if (!criteria.hasNumber) {
    errors.push('Au moins 1 chiffre');
  }
  if (!criteria.hasSpecialChar) {
    errors.push('Au moins 1 caractère spécial (@$!%*?&)');
  }

  const isValid = Object.values(criteria).every(Boolean);

  return {
    isValid,
    errors,
    criteria,
  };
};
