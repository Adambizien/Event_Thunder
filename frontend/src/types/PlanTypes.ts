export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  currency: string;
  stripe_price_id: string;
  max_events: number;
  display_order: number;
  description: string | null;
  created_at: string;
}

export interface FormData {
  name: string;
  price: string;
  interval: 'monthly' | 'yearly';
  currency: 'EUR' | 'USD';
  maxEvents: string;
  displayOrder: string;
  description: string;
}
