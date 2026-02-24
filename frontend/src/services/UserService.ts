import type { User } from '../types/AuthTypes';
import api from './api';

export const userService = {
  async updateProfile(data: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  }) {
    const storedUserStr = localStorage.getItem('user');
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
    const currentEmail = storedUser?.email;

    const response = await api.put('/api/users/profile', {
      currentEmail,
      ...data,
    });
    return response.data;
  },

  async updatePassword(data: { currentPassword: string; newPassword: string }) {
    const storedUserStr = localStorage.getItem('user');
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
    if (!storedUser?.email) {
      throw new Error('Utilisateur non authentifié: email manquant');
    }

    const response = await api.put('/api/users/password', {
      email: storedUser.email,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },

  async fetchUsers(): Promise<User[]> {
    const response = await api.get('/api/users');
    const data = response.data;
    return Array.isArray(data.users) ? data.users : [];
  },

  async updateUserRole(userId: string, role: 'User' | 'Admin'): Promise<void> {
    await api.patch('/api/users/role', { userId, role });
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/api/users/${userId}`);
  },
};
