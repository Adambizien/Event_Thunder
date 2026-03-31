import api from './api';
import type {
  CreateTicketCheckoutPayload,
  CreateTicketCheckoutResponse,
  EventSoldTicketsResponse,
  MyTicketsResponse,
  TicketTypeItem,
  UpsertTicketTypeInput,
} from '../types/TicketTypes';

export const ticketService = {
  async getEventTicketTypes(
    eventId: string,
    options?: { includeInactive?: boolean },
  ): Promise<TicketTypeItem[]> {
    const response = await api.get(`/api/ticketing/events/${eventId}/types`, {
      params: options?.includeInactive
        ? {
            include_inactive: true,
          }
        : undefined,
    });
    const data = response.data;
    return Array.isArray(data) ? (data as TicketTypeItem[]) : [];
  },

  async upsertEventTicketTypes(
    eventId: string,
    ticketTypes: UpsertTicketTypeInput[],
  ): Promise<TicketTypeItem[]> {
    const response = await api.put(`/api/ticketing/events/${eventId}/types`, {
      ticket_types: ticketTypes,
    });

    const data = response.data as { ticket_types?: TicketTypeItem[] };
    return Array.isArray(data.ticket_types) ? data.ticket_types : [];
  },

  async createCheckoutSession(
    payload: CreateTicketCheckoutPayload,
  ): Promise<CreateTicketCheckoutResponse> {
    const response = await api.post('/api/ticketing/checkout-session', payload);
    return response.data as CreateTicketCheckoutResponse;
  },

  async getMyTickets(): Promise<MyTicketsResponse> {
    const response = await api.get('/api/ticketing/me/tickets');
    return response.data as MyTicketsResponse;
  },

  async getEventSoldTickets(eventId: string): Promise<EventSoldTicketsResponse> {
    const response = await api.get(`/api/ticketing/events/${eventId}/sold-tickets`);
    return response.data as EventSoldTicketsResponse;
  },
};