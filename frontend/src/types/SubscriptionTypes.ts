export interface SubscriptionType {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
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
  payments?: PaymentHistoryType[];
}

export interface PaymentHistoryType {
  id: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'failed';
  paidAt: string | null;
  createdAt: string;
}