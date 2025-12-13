import axios from 'axios';

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:8000';
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
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
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

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Google OAuth2 methods
  getGoogleAuthUrl: async () => {
    const response = await api.get('/api/auth/google/url');
    return response.data;
  },

  handleGoogleCallback: async (code) => {
    const response = await api.post('/api/auth/google/callback', { code });
    return response.data;
  },

  // Get stored user data
  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get stored token
  getStoredToken: () => {
    return localStorage.getItem('token');
  }
};

export default api;