import type { User } from '../types/AuthTypes';
import api from './api';

export const userService = {
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
