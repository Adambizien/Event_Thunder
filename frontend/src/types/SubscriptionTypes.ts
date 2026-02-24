export interface SubscriptionType {
  id: string;
  user_id: string;
  plan_id: string;
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: string;
    description?: string;
  };
  status: 'active' | 'canceled';
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  ended_at: string | null;
}
