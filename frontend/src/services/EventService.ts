import api from './api';
import type { CreateEventPayload, EventItem } from '../types/EventTypes';

export const eventService = {
  async fetchEvents(): Promise<EventItem[]> {
    const response = await api.get('/api/events');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  async createEvent(payload: CreateEventPayload): Promise<EventItem> {
    const response = await api.post('/api/events', payload);
    return response.data as EventItem;
  },

  async fetchEventById(id: string): Promise<EventItem> {
    const response = await api.get(`/api/events/${id}`);
    return response.data as EventItem;
  },

  async updateEvent(id: string, payload: CreateEventPayload): Promise<EventItem> {
    const response = await api.patch(`/api/events/${id}`, payload);
    return response.data as EventItem;
  },

  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/api/events/${id}`);
  },
};