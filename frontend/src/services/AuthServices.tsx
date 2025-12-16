import axios from 'axios';
import type { RegisterData, LoginCredentials } from '../types/AuthTypes';

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
};
const API_URL = getApiBaseUrl();

console.log('API URL:', API_URL)
// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor to add token
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

// Response interceptor for error handling
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
  // Register new user
  register: async (userData: RegisterData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  // Verify token and get current user
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Check if user is authenticated fonction non utilisée pour l'instant
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get stored user data fonction non utilisée pour l'instant
  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get stored token fonction non utilisée pour l'instant
  getStoredToken: () => {
    return localStorage.getItem('token');
  },

};

export default api;