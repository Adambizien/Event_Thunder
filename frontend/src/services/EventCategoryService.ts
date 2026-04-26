import api from './api';
import type { EventCategory } from '../types/EventCategoryTypes';

export const eventCategoryService = {
  async fetchCategories(): Promise<EventCategory[]> {
    const response = await api.get('/api/events/categories');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  async createCategory(name: string): Promise<void> {
    await api.post('/api/events/categories', {
      name,
    });
  },

  async updateCategory(id: string, name: string): Promise<void> {
    await api.patch(`/api/events/categories/${id}`, {
      name,
    });
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/api/events/categories/${id}`);
  },
};