import api from './api';

export const subscriptionService = {
  getUserSubscriptions: async (userId: string) => {
    const response = await api.get(`/api/subscriptions/user/${userId}`);
    return response.data;
  },

  getPlans: async () => {
    const response = await api.get('/api/subscriptions/plans');
    return Array.isArray(response.data) ? response.data : [];
  },

  createCheckoutSession: async (payload: {
    userId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    stripeCustomerId?: string;
  }) => {
    const response = await api.post('/api/subscriptions/checkout-session', payload);
    return response.data;
  },
};
