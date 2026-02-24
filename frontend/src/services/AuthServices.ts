
import api from './api';
import type { RegisterData, LoginCredentials } from '../types/AuthTypes';

export const authService = {
  register: async (userData: RegisterData) => {
    const { firstName, lastName, email, password, phoneNumber } = userData;
    const response = await api.post('/api/auth/register', {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
    });
    return response.data;
  },

  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore logout API errors and always clear local session
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetToken: async (token: string) => {
    const response = await api.get('/api/auth/verify-reset-token', { params: { token } });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/api/auth/reset-password', { token, newPassword });
    return response.data;
  },

};
