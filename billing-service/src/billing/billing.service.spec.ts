import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { BillingService } from './billing.service';
import { RabbitmqPublisherService } from './rabbitmq-publisher.service';
import { readSecret } from '../utils/secret.util';

jest.mock('../utils/secret.util', () => ({
  readSecret: jest.fn(),
}));

type CheckoutSession = {
  id: string;
  url: string | null;
};

type MockStripe = {
  checkout: {
    sessions: {
      create: jest.Mock<Promise<CheckoutSession>, [Record<string, unknown>]>;
    };
  };
  subscriptions: {
    retrieve: jest.Mock<Promise<Record<string, unknown>>, [string]>;
    update: jest.Mock<
      Promise<Record<string, unknown>>,
      [string, Record<string, unknown>]
    >;
  };
  invoices: {
    retrieve: jest.Mock<Promise<Record<string, unknown>>, [string]>;
  };
  paymentIntents: {
    retrieve: jest.Mock<
      Promise<Record<string, unknown>>,
      [string, Record<string, unknown>?]
    >;
  };
  refunds: {
    create: jest.Mock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>, Record<string, unknown>]
    >;
  };
  prices: {
    create: jest.Mock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >;
    retrieve: jest.Mock<Promise<Record<string, unknown>>, [string]>;
    update: jest.Mock<
      Promise<Record<string, unknown>>,
      [string, Record<string, unknown>]
    >;
    list: jest.Mock<
      Promise<{ data: Array<Record<string, unknown>> }>,
      [Record<string, unknown>]
    >;
  };
  products: {
    retrieve: jest.Mock<Promise<Record<string, unknown>>, [string]>;
    update: jest.Mock<
      Promise<Record<string, unknown>>,
      [string, Record<string, unknown>]
    >;
  };
  webhooks: {
    constructEvent: jest.Mock<Stripe.Event, [Buffer, string, string]>;
  };
};

type ServiceInternals = {
  stripe?: MockStripe;
  stripeWebhookSecret?: string;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createMockStripe = (): MockStripe => ({
  checkout: {
    sessions: {
      create: createMock<Promise<CheckoutSession>, [Record<string, unknown>]>(),
    },
  },
  subscriptions: {
    retrieve: createMock<Promise<Record<string, unknown>>, [string]>(),
    update: createMock<
      Promise<Record<string, unknown>>,
      [string, Record<string, unknown>]
    >(),
  },
  invoices: {
    retrieve: createMock<Promise<Record<string, unknown>>, [string]>(),
  },
  paymentIntents: {
    retrieve: createMock<
      Promise<Record<string, unknown>>,
      [string, Record<string, unknown>?]
    >(),
  },
  refunds: {
    create: createMock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>, Record<string, unknown>]
    >(),
  },
  prices: {
    create: createMock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >(),
    retrieve: createMock<Promise<Record<string, unknown>>, [string]>(),
    update: createMock<
      Promise<Record<string, unknown>>,
      [string, Record<string, unknown>]
    >(),
    list: createMock<
      Promise<{ data: Array<Record<string, unknown>> }>,
      [Record<string, unknown>]
    >(),
  },
  products: {
    retrieve: createMock<Promise<Record<string, unknown>>, [string]>(),
    update: createMock<
      Promise<Record<string, unknown>>,
      [string, Record<string, unknown>]
    >(),
  },
  webhooks: {
    constructEvent: createMock<Stripe.Event, [Buffer, string, string]>(),
  },
});

describe('BillingService', () => {
  const readSecretMock = readSecret as jest.MockedFunction<typeof readSecret>;
  let configGet: jest.Mock<string | undefined, [string]>;
  let publishWithRetry: jest.Mock<
    Promise<void>,
    [string, Record<string, unknown>]
  >;
  let stripe: MockStripe;
  let service: BillingService;

  beforeEach(() => {
    readSecretMock.mockReturnValue(undefined);
    configGet = jest.fn<string | undefined, [string]>();
    publishWithRetry = jest
      .fn<Promise<void>, [string, Record<string, unknown>]>()
      .mockResolvedValue(undefined);
    stripe = createMockStripe();

    service = new BillingService(
      { get: configGet } as unknown as ConfigService,
      { publishWithRetry } as unknown as RabbitmqPublisherService,
    );
    (service as unknown as ServiceInternals).stripe = stripe;
    (service as unknown as ServiceInternals).stripeWebhookSecret = 'whsec_test';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('refuse les appels Stripe si la cle secrete est absente', async () => {
    const serviceWithoutStripe = new BillingService(
      { get: configGet } as unknown as ConfigService,
      { publishWithRetry } as unknown as RabbitmqPublisherService,
    );

    await expect(
      serviceWithoutStripe.createSubscriptionCheckoutSession({
        userId: 'user-1',
        planId: 'plan-pro',
        stripePriceId: 'price_123',
        successUrl: 'https://app.test/success',
        cancelUrl: 'https://app.test/cancel',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('cree une session checkout abonnement avec les metadata essentielles', async () => {
    stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_sub',
      url: 'https://stripe.test/sub',
    });

    await expect(
      service.createSubscriptionCheckoutSession({
        userId: 'user-1',
        planId: 'plan-pro',
        stripePriceId: 'price_123',
        successUrl: 'https://app.test/success',
        cancelUrl: 'https://app.test/cancel',
        customerEmail: 'user@test.com',
      }),
    ).resolves.toEqual({
      sessionId: 'cs_sub',
      url: 'https://stripe.test/sub',
    });

    const [params] = stripe.checkout.sessions.create.mock.calls[0];

    expect(params).toMatchObject({
      mode: 'subscription',
      client_reference_id: 'user-1',
      customer_email: 'user@test.com',
      line_items: [{ price: 'price_123', quantity: 1 }],
      metadata: {
        userId: 'user-1',
        planId: 'plan-pro',
        customerEmail: 'user@test.com',
      },
      subscription_data: {
        metadata: {
          userId: 'user-1',
          planId: 'plan-pro',
          customerEmail: 'user@test.com',
        },
      },
    });
  });

  it('cree une session checkout ticket avec conversion centimes et metadata', async () => {
    stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_ticket',
      url: 'https://stripe.test/ticket',
    });

    await service.createTicketCheckoutSession({
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
          lastname: 'Lovelace',
          email: 'ada@test.com',
        },
      ],
      items: [
        {
          ticketTypeId: 'ticket-vip',
          name: 'VIP',
          description: 'VIP ticket',
          quantity: 2,
          unitAmount: 12.5,
          currency: 'EUR',
        },
      ],
    });

    const [params] = stripe.checkout.sessions.create.mock.calls[0];

    expect(params).toMatchObject({
      mode: 'payment',
      client_reference_id: 'user-1',
      customer_email: 'user@test.com',
      metadata: {
        userId: 'user-1',
        eventId: 'event-1',
        customerName: 'Ada Lovelace',
      },
    });
    expect(params.line_items).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: 'eur',
          unit_amount: 1250,
          product_data: {
            name: 'VIP',
            description: 'VIP ticket',
            metadata: {
              ticketTypeId: 'ticket-vip',
              eventId: 'event-1',
            },
          },
        },
      },
    ]);
  });

  it('annule seulement a la fin de periode quand necessaire', async () => {
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      status: 'active',
      cancel_at_period_end: false,
    });
    stripe.subscriptions.update.mockResolvedValue({});

    await expect(service.cancelSubscription('sub_123')).resolves.toEqual({
      canceled: true,
      stripeSubscriptionId: 'sub_123',
    });

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      cancel_at_period_end: true,
    });
  });

  it('refuse de reprendre un abonnement deja termine', async () => {
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      status: 'canceled',
    });

    await expect(service.resumeSubscription('sub_123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('synchronise un prix de plan Stripe', async () => {
    stripe.prices.create.mockResolvedValue({
      id: 'price_new',
      product: 'prod_new',
    });

    await expect(
      service.syncPlanPrice({
        planId: 'plan-pro',
        name: 'Pro',
        price: 19.99,
        interval: 'monthly',
      }),
    ).resolves.toEqual({
      stripePriceId: 'price_new',
      stripeProductId: 'prod_new',
    });

    expect(stripe.prices.create).toHaveBeenCalledWith({
      unit_amount: 1999,
      currency: 'eur',
      recurring: { interval: 'month' },
      product_data: {
        name: 'Pro',
        metadata: { planId: 'plan-pro' },
      },
      metadata: { planId: 'plan-pro' },
    });
  });

  it('archive le prix et desactive le produit si aucun prix actif ne reste', async () => {
    stripe.prices.retrieve.mockResolvedValue({
      id: 'price_old',
      product: 'prod_old',
    });
    stripe.products.retrieve.mockResolvedValue({
      id: 'prod_old',
      default_price: 'price_old',
    });
    stripe.prices.update.mockResolvedValue({});
    stripe.prices.list.mockResolvedValue({ data: [] });
    stripe.products.update.mockResolvedValue({});

    await expect(service.archivePlanPrice('price_old')).resolves.toEqual({
      archived: true,
      stripePriceId: 'price_old',
    });

    expect(stripe.products.update).toHaveBeenCalledWith('prod_old', {
      default_price: '',
    });
    expect(stripe.prices.update).toHaveBeenCalledWith('price_old', {
      active: false,
    });
    expect(stripe.products.update).toHaveBeenCalledWith('prod_old', {
      active: false,
    });
  });

  it('valide la signature webhook Stripe et rejette une signature invalide', () => {
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: {} },
    } as unknown as Stripe.Event;
    stripe.webhooks.constructEvent.mockReturnValue(event);

    expect(service.constructWebhookEvent(Buffer.from('{}'), 'sig')).toBe(event);

    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    expect(() =>
      service.constructWebhookEvent(Buffer.from('{}'), 'sig'),
    ).toThrow(BadRequestException);
  });

  it('publie un paiement ticket reussi depuis un webhook checkout', async () => {
    stripe.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_123',
      latest_charge: {
        receipt_url: 'https://stripe.test/receipt',
        invoice: {
          hosted_invoice_url: 'https://stripe.test/invoice',
          invoice_pdf: 'https://stripe.test/invoice.pdf',
        },
      },
    });

    await service.handleWebhookEvent({
      id: 'evt_ticket',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_ticket',
          mode: 'payment',
          payment_intent: 'pi_123',
          client_reference_id: 'user-1',
          customer_email: 'user@test.com',
          created: 1_700_000_000,
          currency: 'eur',
          amount_total: 2500,
          metadata: {
            userId: 'user-1',
            eventId: 'event-1',
            customerName: 'Ada',
            ticketItems: JSON.stringify([
              {
                ticketTypeId: 'ticket-vip',
                name: 'VIP',
                quantity: 1,
                unitAmount: 25,
                currency: 'eur',
              },
            ]),
            attendees: JSON.stringify([
              {
                ticketTypeId: 'ticket-vip',
                firstname: 'Ada',
                lastname: 'Lovelace',
                email: 'ada@test.com',
              },
            ]),
          },
        },
      },
    } as unknown as Stripe.Event);

    expect(publishWithRetry.mock.calls).toHaveLength(1);

    const [routingKey, payload] = publishWithRetry.mock.calls[0];

    expect(routingKey).toBe('billing.ticket.payment.succeeded');
    expect(payload).toMatchObject({
      userId: 'user-1',
      eventId: 'event-1',
      customerName: 'Ada',
      customerEmail: 'user@test.com',
      stripePaymentIntentId: 'pi_123',
      stripeCheckoutSessionId: 'cs_ticket',
      hostedInvoiceUrl: 'https://stripe.test/invoice',
      invoicePdfUrl: 'https://stripe.test/invoice.pdf',
      receiptUrl: 'https://stripe.test/receipt',
      currency: 'EUR',
      amountTotal: 25,
    });
  });

  it('publie les events paiement et renouvellement pour une facture payee', async () => {
    stripe.subscriptions.retrieve.mockResolvedValue({
      metadata: {
        userId: 'user-1',
        planId: 'plan-pro',
        customerEmail: 'user@test.com',
      },
    });

    await service.handleWebhookEvent({
      id: 'evt_invoice',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_123',
          subscription: 'sub_123',
          amount_paid: 1999,
          currency: 'eur',
          description: 'Pro monthly',
          hosted_invoice_url: 'https://stripe.test/invoice',
          invoice_pdf: 'https://stripe.test/invoice.pdf',
          status_transitions: { paid_at: 1_700_000_000 },
          lines: {
            data: [
              {
                period: {
                  start: 1_700_000_000,
                  end: 1_702_592_000,
                },
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event);

    expect(publishWithRetry.mock.calls).toHaveLength(2);

    expect(publishWithRetry.mock.calls[0][0]).toBe('billing.payment.succeeded');
    expect(publishWithRetry.mock.calls[0][1]).toMatchObject({
      userId: 'user-1',
      planId: 'plan-pro',
      stripeSubscriptionId: 'sub_123',
      stripeInvoiceId: 'in_123',
      amount: 19.99,
      currency: 'EUR',
      status: 'paid',
    });
    expect(publishWithRetry.mock.calls[1][0]).toBe(
      'billing.subscription.renewed',
    );
    expect(publishWithRetry.mock.calls[1][1]).toMatchObject({
      stripeSubscriptionId: 'sub_123',
      status: 'active',
    });
  });
});
