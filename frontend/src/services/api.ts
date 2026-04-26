import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return 'http://localhost:8000';
};

const API_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

const extractErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Erreur inconnue';
  }

  const payload = error.response?.data as
    | { message?: string | string[]; error?: string }
    | undefined;

  if (Array.isArray(payload?.message) && payload.message.length > 0) {
    return payload.message.join(', ');
  }

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  return error.message || 'Erreur inconnue';
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || '');
    const isAuthSessionRoute =
      requestUrl.includes('/api/auth/verify') ||
      requestUrl.includes('/api/auth/logout');

    if (status === 401 || (status === 403 && isAuthSessionRoute)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    return Promise.reject(new Error(extractErrorMessage(error)));
  }
);

export default api;