export type EventStatus = 'draft' | 'published' | 'canceled' | 'completed';

export type EventItem = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category_id: string;
  location: string;
  address: string;
  start_date: string;
  end_date: string;
  image_url: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
  };
};

export type CreateEventPayload = {
  creator_id?: string;
  title: string;
  description: string;
  category_id: string;
  location: string;
  address: string;
  start_date: string;
  end_date: string;
  image_url?: string;
  status?: EventStatus;
};