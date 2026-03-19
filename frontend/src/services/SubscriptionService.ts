import api from './api';
import type {
  PaymentHistoryType,
  SubscriptionType,
} from '../types/SubscriptionTypes';

const normalizeSubscription = (
  subscription: Record<string, unknown>,
): SubscriptionType => {
  const payments: PaymentHistoryType[] = Array.isArray(subscription.payments)
    ? subscription.payments.map((payment) => {
        const paymentRecord = payment as Record<string, unknown>;

        return {
          id: String(paymentRecord.id ?? ''),
          subscriptionId: String(paymentRecord.subscription_id ?? paymentRecord.subscriptionId ?? ''),
          stripeInvoiceId: String(
            paymentRecord.stripe_invoice_id ?? paymentRecord.stripeInvoiceId ?? '',
          ),
          amount: Number(paymentRecord.amount ?? 0),
          currency: String(paymentRecord.currency ?? 'EUR'),
          status:
            String(paymentRecord.status ?? 'paid') === 'failed'
              ? 'failed'
              : 'paid',
          paidAt: (paymentRecord.paid_at ?? paymentRecord.paidAt ?? null) as string | null,
          createdAt: String(paymentRecord.created_at ?? paymentRecord.createdAt ?? ''),
        };
      })
    : [];

  return {
    ...(subscription as Omit<SubscriptionType, 'payments'>),
    payments,
  };
};

export const subscriptionService = {
  getUserSubscriptions: async (userId: string): Promise<SubscriptionType[]> => {
    const response = await api.get(`/api/subscriptions/user/${userId}`);
    return Array.isArray(response.data)
      ? response.data.map((subscription) => normalizeSubscription(subscription as Record<string, unknown>))
      : [];
  },

  getAdminSubscriptionsOverview: async (): Promise<SubscriptionType[]> => {
    const response = await api.get('/api/subscriptions/admin/overview');
    return Array.isArray(response.data)
      ? response.data.map((subscription) => normalizeSubscription(subscription as Record<string, unknown>))
      : [];
  },

  getPlans: async () => {
    const response = await api.get('/api/subscriptions/plans');
    return Array.isArray(response.data) ? response.data : [];
  },

  createCheckoutSession: async (payload: {
    userId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    stripeCustomerId?: string;
  }) => {
    const response = await api.post('/api/subscriptions/checkout-session', payload);
    return response.data;
  },

  cancelSubscription: async (payload: {
    userId: string;
    stripeSubscriptionId: string;
  }) => {
    const response = await api.post('/api/subscriptions/cancel', payload);
    return response.data;
  },

  finalizePlanChange: async (payload: {
    userId: string;
    activePlanId?: string;
  }) => {
    const response = await api.post(
      '/api/subscriptions/finalize-plan-change',
      payload,
      { timeout: 30000 },
    );
    return response.data;
  },

  getInvoiceLinks: async (stripeInvoiceId: string, userId?: string) => {
    const response = await api.get(
      `/api/subscriptions/invoices/${encodeURIComponent(stripeInvoiceId)}`,
      userId ? { params: { userId } } : undefined,
    );
    return response.data as {
      hostedInvoiceUrl: string | null;
      invoicePdfUrl: string | null;
    };
  },
};