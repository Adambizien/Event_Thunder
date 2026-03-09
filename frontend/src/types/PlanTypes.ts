export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  currency: string;
  stripePriceId: string;
  maxEvents: number;
  maxPosts: number;
  maxEventsPeriod: 'weekly' | 'monthly';
  maxPostsPeriod: 'weekly' | 'monthly';
  displayOrder: number;
  description: string | null;
  createdAt: string;
}

export interface FormData {
  name: string;
  price: string;
  interval: 'monthly' | 'yearly';
  currency: 'EUR' | 'USD';
  maxEvents: string;
  maxPosts: string;
  maxEventsPeriod: 'weekly' | 'monthly';
  maxPostsPeriod: 'weekly' | 'monthly';
  displayOrder: string;
  description: string;
}