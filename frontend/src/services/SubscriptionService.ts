import api from './api';

export const subscriptionService = {
  getUserSubscriptions: async (userId: string) => {
    const response = await api.get(`/api/subscriptions/user/${userId}`);
    return response.data;
  },
};
