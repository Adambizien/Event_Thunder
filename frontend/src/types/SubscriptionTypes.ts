export interface SubscriptionType {
  id: string;
  userId: string;
  planId: string;
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: string;
    description?: string;
  };
  status: 'active' | 'canceled';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  endedAt: string | null;
}
