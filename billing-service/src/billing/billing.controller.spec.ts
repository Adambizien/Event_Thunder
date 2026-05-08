import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type Stripe from 'stripe';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

type BillingServiceMock = {
  createSubscriptionCheckoutSession: jest.Mock;
  createTicketCheckoutSession: jest.Mock;
  refundTicketPayment: jest.Mock;
  cancelSubscription: jest.Mock;
  resumeSubscription: jest.Mock;
  getInvoiceLinks: jest.Mock;
  getTicketPaymentLinks: jest.Mock;
  syncPlanPrice: jest.Mock;
  archivePlanPrice: jest.Mock;
  constructWebhookEvent: jest.Mock;
  handleWebhookEvent: jest.Mock;
};

type RequestMock = {
  rawBody?: Buffer;
  user?: {
    id?: string;
    role?: string;
  };
};

const createBillingServiceMock = (): BillingServiceMock => ({
  createSubscriptionCheckoutSession: jest.fn(),
  createTicketCheckoutSession: jest.fn(),
  refundTicketPayment: jest.fn(),
  cancelSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  getInvoiceLinks: jest.fn(),
  getTicketPaymentLinks: jest.fn(),
  syncPlanPrice: jest.fn(),
  archivePlanPrice: jest.fn(),
  constructWebhookEvent: jest.fn(),
  handleWebhookEvent: jest.fn(),
});

describe('BillingController', () => {
  let billingService: BillingServiceMock;
  let controller: BillingController;

  beforeEach(() => {
    billingService = createBillingServiceMock();
    controller = new BillingController(
      billingService as unknown as BillingService,
    );
  });

  it('cree une session abonnement pour son propre utilisateur', async () => {
    billingService.createSubscriptionCheckoutSession.mockResolvedValue({
      sessionId: 'cs_sub',
      url: 'https://stripe.test/sub',
    });

    const dto = {
      userId: 'user-1',
      planId: 'plan-pro',
      stripePriceId: 'price_123',
      successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel',
      customerEmail: 'user@test.com',
    };

    await expect(
      controller.createSubscriptionCheckoutSession(dto, {
        user: { id: 'user-1', role: 'User' },
      }),
    ).resolves.toEqual({
      sessionId: 'cs_sub',
      url: 'https://stripe.test/sub',
    });

    expect(
      billingService.createSubscriptionCheckoutSession,
    ).toHaveBeenCalledWith(dto);
  });

  it('refuse une session abonnement pour un autre utilisateur non admin', async () => {
    await expect(
      controller.createSubscriptionCheckoutSession(
        {
          userId: 'user-2',
          planId: 'plan-pro',
          stripePriceId: 'price_123',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel',
        },
        { user: { id: 'user-1', role: 'User' } },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('valide les donnees de checkout ticket importantes', async () => {
    await expect(
      controller.createTicketCheckoutSession(
        {
          userId: 'user-1',
          eventId: 'event-1',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel',
          customerEmail: 'user@test.com',
          customerName: 'Ada Lovelace',
          attendees: [
            {
              ticketTypeId: 'ticket-vip',
              firstname: 'Ada',
              lastname: '',
              email: 'ada@test.com',
            },
          ],
          items: [
            {
              ticketTypeId: 'ticket-vip',
              name: 'VIP',
              quantity: 1,
              unitAmount: 25,
              currency: 'eur',
            },
          ],
        },
        { user: { id: 'user-1' } },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(billingService.createTicketCheckoutSession).not.toHaveBeenCalled();
  });

  it('annule un abonnement uniquement pour le proprietaire ou un admin', async () => {
    billingService.cancelSubscription.mockResolvedValue({
      canceled: true,
      stripeSubscriptionId: 'sub_123',
    });

    await expect(
      controller.cancelSubscription(
        { userId: 'user-1', stripeSubscriptionId: 'sub_123' },
        { user: { id: 'admin-1', role: 'Admin' } },
      ),
    ).resolves.toEqual({
      canceled: true,
      stripeSubscriptionId: 'sub_123',
    });

    expect(billingService.cancelSubscription).toHaveBeenCalledWith('sub_123');
  });

  it('valide les champs de synchronisation de prix', async () => {
    await expect(
      controller.syncPlanPrice({
        name: 'Pro',
        price: 0,
        interval: 'monthly',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.syncPlanPrice({
        name: 'Pro',
        price: 19.99,
        interval: 'weekly' as 'monthly',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(billingService.syncPlanPrice).not.toHaveBeenCalled();
  });

  it('cree un remboursement ticket avec une raison valide', async () => {
    billingService.refundTicketPayment.mockResolvedValue({
      refundId: 're_123',
      status: 'succeeded',
      amount: 25,
      currency: 'EUR',
    });

    await expect(
      controller.createTicketRefund({
        stripePaymentIntentId: 'pi_123',
        reason: 'requested_by_customer',
      }),
    ).resolves.toEqual({
      refundId: 're_123',
      status: 'succeeded',
      amount: 25,
      currency: 'EUR',
    });

    expect(billingService.refundTicketPayment).toHaveBeenCalledWith(
      'pi_123',
      'requested_by_customer',
    );
  });

  it('refuse un webhook Stripe sans signature ou raw body', async () => {
    await expect(
      controller.stripeWebhook({ rawBody: Buffer.from('{}') }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.stripeWebhook({} as RequestMock, 'sig'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('construit et traite un webhook Stripe valide', async () => {
    const event = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: { object: {} },
    } as unknown as Stripe.Event;
    billingService.constructWebhookEvent.mockReturnValue(event);
    billingService.handleWebhookEvent.mockResolvedValue(undefined);

    await expect(
      controller.stripeWebhook({ rawBody: Buffer.from('{}') }, 'sig'),
    ).resolves.toEqual({ received: true });

    expect(billingService.constructWebhookEvent).toHaveBeenCalledWith(
      Buffer.from('{}'),
      'sig',
    );
    expect(billingService.handleWebhookEvent).toHaveBeenCalledWith(event);
  });
});
