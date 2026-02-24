import type { Plan, FormData } from '../types/PlanTypes';
import api from './api';

export const planService = {
  async fetchPlans(): Promise<Plan[]> {
    const response = await api.get('/api/subscriptions/plans');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  async createPlan(formData: FormData): Promise<void> {
    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      interval: formData.interval,
      currency: formData.currency,
      maxEvents: parseInt(formData.maxEvents),
      displayOrder: parseInt(formData.displayOrder),
      description: formData.description.trim() || null,
    };
    await api.post('/api/subscriptions/plans', payload);
  },

  async updatePlan(id: string, formData: FormData): Promise<void> {
    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      interval: formData.interval,
      currency: formData.currency,
      maxEvents: parseInt(formData.maxEvents),
      displayOrder: parseInt(formData.displayOrder),
      description: formData.description.trim() || null,
    };
    await api.patch(`/api/subscriptions/plans/${id}`, payload);
  },

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/api/subscriptions/plans/${id}`);
  },
};