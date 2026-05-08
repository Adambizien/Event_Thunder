import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import api from './api';
import { authService } from './AuthServices';
import { userService } from './UserService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const apiMock = api as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
  patch: Mock;
  delete: Mock;
};

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
};

describe('authService et userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
    });
  });

  it('envoie uniquement les champs attendus a l inscription', async () => {
    apiMock.post.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    await expect(
      authService.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongPass123!',
        phoneNumber: '0612345678',
      }),
    ).resolves.toEqual({ user: { id: 'user-1' } });

    expect(apiMock.post).toHaveBeenCalledWith('/api/auth/register', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'StrongPass123!',
      phoneNumber: '0612345678',
    });
  });

  it('nettoie la session locale meme si le logout backend echoue', async () => {
    localStorage.setItem('token', 'token-1');
    localStorage.setItem('user', JSON.stringify({ id: 'user-1' }));
    apiMock.post.mockRejectedValue(new Error('network'));

    await authService.logout();

    expect(apiMock.post).toHaveBeenCalledWith('/api/auth/logout');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
  });

  it('lit l utilisateur stocke et renvoie null quand absent', () => {
    expect(authService.getStoredUser()).toBeNull();

    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'user-1', email: 'john@example.com' }),
    );

    expect(authService.getStoredUser()).toEqual({
      id: 'user-1',
      email: 'john@example.com',
    });
  });

  it('ajoute le currentEmail du localStorage pendant la mise a jour du profil', async () => {
    localStorage.setItem('user', JSON.stringify({ email: 'old@example.com' }));
    apiMock.put.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    await expect(
      userService.updateProfile({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'new@example.com',
      }),
    ).resolves.toEqual({ user: { id: 'user-1' } });

    expect(apiMock.put).toHaveBeenCalledWith('/api/users/profile', {
      currentEmail: 'old@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'new@example.com',
    });
  });

  it('refuse un changement de mot de passe sans email utilisateur stocke', async () => {
    await expect(
      userService.updatePassword({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    ).rejects.toThrow('Utilisateur non authentifié: email manquant');

    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it('retourne une liste vide quand fetchUsers recoit une forme inattendue', async () => {
    apiMock.get.mockResolvedValue({ data: { users: null } });

    await expect(userService.fetchUsers()).resolves.toEqual([]);
  });
});