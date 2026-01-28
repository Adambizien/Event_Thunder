import axios from 'axios';
import type { RegisterData, LoginCredentials } from '../types/AuthTypes';

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
};
const API_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

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
    } catch (error) {

      console.error('Logout error:', error);
    } finally {

      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getStoredToken: () => {
    return localStorage.getItem('token');
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

export const userService = {
  updateProfile: async (data: { firstName: string; lastName: string; email: string; phoneNumber?: string }) => {
    const storedUserStr = localStorage.getItem('user');
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
    const currentEmail = storedUser?.email;
    
    const response = await api.put('/api/users/profile', {
      currentEmail,
      ...data,
    });
    return response.data;
  },

  updatePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const storedUserStr = localStorage.getItem('user');
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
    if (!storedUser?.email) {
      throw new Error('Utilisateur non authentifié: email manquant');
    }
    const payload = {
      email: storedUser.email,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    };
    const response = await api.put('/api/users/password', payload);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },
};

export default api;