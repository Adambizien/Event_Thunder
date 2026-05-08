import { describe, expect, it } from 'vitest';
import { validatePassword } from './passwordValidator';

describe('validatePassword', () => {
  it('valide un mot de passe qui respecte toutes les regles importantes', () => {
    expect(validatePassword('StrongPass123!')).toEqual({
      isValid: true,
      errors: [],
      criteria: {
        minLength: true,
        hasLowercase: true,
        hasUppercase: true,
        hasNumber: true,
        hasSpecialChar: true,
      },
    });
  });

  it('retourne les erreurs de securite manquantes', () => {
    const result = validatePassword('short');

    expect(result.isValid).toBe(false);
    expect(result.criteria).toEqual({
      minLength: false,
      hasLowercase: true,
      hasUppercase: false,
      hasNumber: false,
      hasSpecialChar: false,
    });
    expect(result.errors).toEqual([
      'Au moins 12 caractères',
      'Au moins 1 lettre majuscule',
      'Au moins 1 chiffre',
      'Au moins 1 caractère spécial (@$!%*?&)',
    ]);
  });
});