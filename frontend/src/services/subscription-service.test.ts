import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import api from './api';
import { subscriptionService } from './SubscriptionService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const apiMock = api as unknown as {
  get: Mock;
  post: Mock;
};

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalise les paiements snake_case/camelCase des abonnements utilisateur', async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          id: 'sub-1',
          status: 'active',
          payments: [
            {
              id: 'pay-1',
              subscription_id: 'sub-1',
              stripe_invoice_id: 'in_1',
              amount: '1999',
              currency: 'eur',
              status: 'failed',
              paid_at: null,
              created_at: '2026-05-01T10:00:00.000Z',
            },
            {
              id: 'pay-2',
              subscriptionId: 'sub-1',
              stripeInvoiceId: 'in_2',
              amount: 999,
              status: 'paid',
              paidAt: '2026-05-02T10:00:00.000Z',
              createdAt: '2026-05-02T10:00:00.000Z',
            },
          ],
        },
      ],
    });

    await expect(
      subscriptionService.getUserSubscriptions('user-1'),
    ).resolves.toMatchObject([
      {
        id: 'sub-1',
        payments: [
          {
            id: 'pay-1',
            subscriptionId: 'sub-1',
            stripeInvoiceId: 'in_1',
            amount: 1999,
            currency: 'eur',
            status: 'failed',
            paidAt: null,
            createdAt: '2026-05-01T10:00:00.000Z',
          },
          {
            id: 'pay-2',
            subscriptionId: 'sub-1',
            stripeInvoiceId: 'in_2',
            amount: 999,
            currency: 'EUR',
            status: 'paid',
            paidAt: '2026-05-02T10:00:00.000Z',
            createdAt: '2026-05-02T10:00:00.000Z',
          },
        ],
      },
    ]);
  });

  it('encode l id invoice et ajoute userId seulement quand fourni', async () => {
    apiMock.get.mockResolvedValue({
      data: {
        hostedInvoiceUrl: 'https://stripe.test/invoice',
        invoicePdfUrl: null,
      },
    });

    await expect(
      subscriptionService.getInvoiceLinks('in voice/1', 'user-1'),
    ).resolves.toEqual({
      hostedInvoiceUrl: 'https://stripe.test/invoice',
      invoicePdfUrl: null,
    });

    expect(apiMock.get).toHaveBeenCalledWith(
      '/api/subscriptions/invoices/in%20voice%2F1',
      { params: { userId: 'user-1' } },
    );

    await subscriptionService.getInvoiceLinks('in_2');
    expect(apiMock.get).toHaveBeenLastCalledWith(
      '/api/subscriptions/invoices/in_2',
      undefined,
    );
  });
});