export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  currency: string;
  stripePriceId: string;
  maxEvents: number;
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
  displayOrder: string;
  description: string;
}
