import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  PaymentCurrency,
  PaymentStatus,
  PlanCurrency,
  PlanInterval,
  SubscriptionStatus,
} from '@prisma/client';
import { of } from 'rxjs';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';

type PlanRecord = {
  id: string;
  name: string;
  price: number;
  interval: PlanInterval;
  currency: PlanCurrency;
  stripe_price_id: string;
  max_events: number;
  max_posts: number;
  display_order: number;
  description: string | null;
  created_at: Date;
};

type SubscriptionRecord = {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  current_period_start: Date | null;
  current_period_end: Date | null;
  canceled_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type PaymentRecord = {
  id: string;
  subscription_id: string;
  stripe_invoice_id: string;
  amount: number;
  currency: PaymentCurrency;
  status: PaymentStatus;
  paid_at: Date | null;
  created_at: Date;
};

type SubscriptionWithRelations = SubscriptionRecord & {
  plan: PlanRecord;
  payments: PaymentRecord[];
};

type TransactionClient = {
  subscription: {
    findUnique: jest.Mock<
      Promise<SubscriptionRecord | null>,
      [Record<string, unknown>]
    >;
    updateMany: jest.Mock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >;
    create: jest.Mock<Promise<SubscriptionRecord>, [Record<string, unknown>]>;
    update: jest.Mock<Promise<SubscriptionRecord>, [Record<string, unknown>]>;
  };
};

type PrismaMock = {
  plan: {
    create: jest.Mock<Promise<PlanRecord>, [Record<string, unknown>]>;
    findUnique: jest.Mock<
      Promise<PlanRecord | null>,
      [Record<string, unknown>]
    >;
    findMany: jest.Mock<Promise<PlanRecord[]>, [Record<string, unknown>]>;
    update: jest.Mock<Promise<PlanRecord>, [Record<string, unknown>]>;
    delete: jest.Mock<Promise<PlanRecord>, [Record<string, unknown>]>;
  };
  subscription: {
    findMany: jest.Mock<
      Promise<SubscriptionRecord[] | SubscriptionWithRelations[]>,
      [Record<string, unknown>]
    >;
    findFirst: jest.Mock<
      Promise<SubscriptionRecord | null>,
      [Record<string, unknown>]
    >;
    findUnique: jest.Mock<
      Promise<SubscriptionRecord | null>,
      [Record<string, unknown>]
    >;
    update: jest.Mock<Promise<SubscriptionRecord>, [Record<string, unknown>]>;
    updateMany: jest.Mock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >;
    create: jest.Mock<Promise<SubscriptionRecord>, [Record<string, unknown>]>;
  };
  paymentSubHistory: {
    findUnique: jest.Mock<
      Promise<
        | (PaymentRecord & { subscription: SubscriptionRecord })
        | PaymentRecord
        | null
      >,
      [Record<string, unknown>]
    >;
    create: jest.Mock<Promise<PaymentRecord>, [Record<string, unknown>]>;
  };
  $transaction: jest.Mock<
    Promise<void>,
    [(tx: TransactionClient) => Promise<void>]
  >;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const makePlan = (overrides: Partial<PlanRecord> = {}): PlanRecord => ({
  id: 'plan-1',
  name: 'Pro',
  price: 19.99,
  interval: PlanInterval.monthly,
  currency: PlanCurrency.EUR,
  stripe_price_id: 'price_old',
  max_events: 10,
  max_posts: 20,
  display_order: 1,
  description: 'Pro plan',
  created_at: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

const makeSubscription = (
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord => ({
  id: 'sub-1',
  user_id: 'user-1',
  plan_id: 'plan-1',
  stripe_subscription_id: 'stripe-sub-1',
  status: SubscriptionStatus.active,
  current_period_start: new Date('2026-01-01T10:00:00.000Z'),
  current_period_end: new Date('2099-01-01T10:00:00.000Z'),
  canceled_at: null,
  ended_at: null,
  created_at: new Date('2026-01-01T10:00:00.000Z'),
  updated_at: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

const makePrisma = (): PrismaMock => ({
  plan: {
    create: createMock<Promise<PlanRecord>, [Record<string, unknown>]>(),
    findUnique: createMock<
      Promise<PlanRecord | null>,
      [Record<string, unknown>]
    >(),
    findMany: createMock<Promise<PlanRecord[]>, [Record<string, unknown>]>(),
    update: createMock<Promise<PlanRecord>, [Record<string, unknown>]>(),
    delete: createMock<Promise<PlanRecord>, [Record<string, unknown>]>(),
  },
  subscription: {
    findMany: createMock<
      Promise<SubscriptionRecord[] | SubscriptionWithRelations[]>,
      [Record<string, unknown>]
    >(),
    findFirst: createMock<
      Promise<SubscriptionRecord | null>,
      [Record<string, unknown>]
    >(),
    findUnique: createMock<
      Promise<SubscriptionRecord | null>,
      [Record<string, unknown>]
    >(),
    update: createMock<
      Promise<SubscriptionRecord>,
      [Record<string, unknown>]
    >(),
    updateMany: createMock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >(),
    create: createMock<
      Promise<SubscriptionRecord>,
      [Record<string, unknown>]
    >(),
  },
  paymentSubHistory: {
    findUnique: createMock<
      Promise<
        | (PaymentRecord & { subscription: SubscriptionRecord })
        | PaymentRecord
        | null
      >,
      [Record<string, unknown>]
    >(),
    create: createMock<Promise<PaymentRecord>, [Record<string, unknown>]>(),
  },
  $transaction: createMock<
    Promise<void>,
    [(tx: TransactionClient) => Promise<void>]
  >(),
});

describe('SubscriptionsService', () => {
  let prisma: PrismaMock;
  let httpPost: jest.Mock;
  let httpGet: jest.Mock;
  let service: SubscriptionsService;

  beforeEach(() => {
    prisma = makePrisma();
    prisma.$transaction.mockImplementation((callback) =>
      callback({
        subscription: {
          findUnique: prisma.subscription.findUnique,
          updateMany: prisma.subscription.updateMany,
          create: prisma.subscription.create,
          update: prisma.subscription.update,
        },
      }),
    );
    httpPost = jest.fn();
    httpGet = jest.fn();
    service = new SubscriptionsService(
      prisma as unknown as PrismaService,
      { post: httpPost, get: httpGet } as unknown as HttpService,
      {
        get: jest.fn<string | undefined, [string]>(() => 'http://billing.test'),
      } as unknown as ConfigService,
    );
  });

  it('cree un plan en synchronisant le prix Stripe si absent', async () => {
    httpPost.mockReturnValue(of({ data: { stripePriceId: 'price_new' } }));
    prisma.plan.create.mockResolvedValue(
      makePlan({ stripe_price_id: 'price_new' }),
    );

    await expect(
      service.createPlan(
        {
          name: 'Pro',
          price: 19.99,
          interval: PlanInterval.monthly,
          maxEvents: 10,
          maxPosts: 20,
        },
        'Bearer token',
      ),
    ).resolves.toMatchObject({
      id: 'plan-1',
      stripePriceId: 'price_new',
      price: 19.99,
    });

    expect(httpPost).toHaveBeenCalledWith(
      'http://billing.test/api/billing/plans/sync-price',
      {
        planId: undefined,
        name: 'Pro',
        price: 19.99,
        interval: PlanInterval.monthly,
        currency: 'eur',
      },
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('met a jour un plan en recreant le prix et archive l ancien', async () => {
    prisma.plan.findUnique.mockResolvedValue(makePlan());
    prisma.plan.update.mockResolvedValue(
      makePlan({ price: 29.99, stripe_price_id: 'price_new' }),
    );
    httpPost
      .mockReturnValueOnce(of({ data: { stripePriceId: 'price_new' } }))
      .mockReturnValueOnce(of({ data: { archived: true } }));

    await expect(
      service.updatePlan('plan-1', { price: 29.99 }, 'Bearer token'),
    ).resolves.toMatchObject({
      price: 29.99,
      stripePriceId: 'price_new',
    });

    expect(httpPost).toHaveBeenNthCalledWith(
      2,
      'http://billing.test/api/billing/plans/archive-price',
      { stripePriceId: 'price_old' },
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('cree une session checkout si le user nest pas deja actif sur ce plan', async () => {
    prisma.plan.findUnique.mockResolvedValue(makePlan());
    prisma.subscription.findMany.mockResolvedValue([]);
    httpPost.mockReturnValue(
      of({ data: { sessionId: 'cs_123', url: 'https://stripe.test' } }),
    );

    await expect(
      service.createCheckoutSession(
        {
          userId: 'user-1',
          planId: 'plan-1',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel',
          customerEmail: 'user@test.com',
        },
        'Bearer token',
      ),
    ).resolves.toEqual({ sessionId: 'cs_123', url: 'https://stripe.test' });

    expect(httpPost).toHaveBeenCalledWith(
      'http://billing.test/api/billing/subscriptions/checkout-session',
      expect.objectContaining({
        userId: 'user-1',
        planId: 'plan-1',
        stripePriceId: 'price_old',
      }),
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('refuse une session checkout si le user est deja actif sur ce plan', async () => {
    prisma.plan.findUnique.mockResolvedValue(makePlan());
    prisma.subscription.findMany.mockResolvedValue([makeSubscription()]);

    await expect(
      service.createCheckoutSession({
        userId: 'user-1',
        planId: 'plan-1',
        successUrl: 'https://app.test/success',
        cancelUrl: 'https://app.test/cancel',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('annule puis reprend un abonnement via billing', async () => {
    prisma.subscription.findFirst
      .mockResolvedValueOnce(makeSubscription())
      .mockResolvedValueOnce(
        makeSubscription({
          status: SubscriptionStatus.canceled,
          canceled_at: new Date(),
        }),
      );
    prisma.subscription.update.mockResolvedValue(makeSubscription());
    httpPost.mockReturnValue(of({ data: {} }));

    await expect(
      service.cancelSubscription('user-1', 'stripe-sub-1', 'Bearer token'),
    ).resolves.toEqual({ message: 'Abonnement annulé avec succès' });
    await expect(
      service.resumeSubscription('user-1', 'stripe-sub-1', 'Bearer token'),
    ).resolves.toEqual({ message: 'Annulation retirée, abonnement réactivé' });

    expect(httpPost).toHaveBeenCalledWith(
      'http://billing.test/api/billing/subscriptions/cancel',
      { userId: 'user-1', stripeSubscriptionId: 'stripe-sub-1' },
      { headers: { Authorization: 'Bearer token' } },
    );
    expect(httpPost).toHaveBeenCalledWith(
      'http://billing.test/api/billing/subscriptions/resume',
      { userId: 'user-1', stripeSubscriptionId: 'stripe-sub-1' },
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('protege les liens de facture par ownership', async () => {
    prisma.paymentSubHistory.findUnique.mockResolvedValue({
      id: 'pay-1',
      subscription_id: 'sub-1',
      stripe_invoice_id: 'in_1',
      amount: 19.99,
      currency: PaymentCurrency.EUR,
      status: PaymentStatus.paid,
      paid_at: new Date(),
      created_at: new Date(),
      subscription: makeSubscription({ user_id: 'other-user' }),
    });

    await expect(
      service.getInvoiceLinks('user-1', 'in_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('consolide un changement de plan en gardant le plan actif cible', async () => {
    const keep = makeSubscription({ id: 'sub-new', plan_id: 'plan-new' });
    const old = makeSubscription({
      id: 'sub-old',
      plan_id: 'plan-old',
      stripe_subscription_id: 'stripe-old',
    });
    prisma.subscription.findMany
      .mockResolvedValueOnce([keep, old])
      .mockResolvedValueOnce([]);
    prisma.subscription.update.mockResolvedValue(old);
    httpPost.mockReturnValue(of({ data: {} }));

    await expect(
      service.finalizePlanChange('user-1', 'plan-new', 'Bearer token'),
    ).resolves.toEqual({
      message: 'Changement de plan finalisé',
      canceledCount: 1,
    });

    expect(httpPost).toHaveBeenCalledWith(
      'http://billing.test/api/billing/subscriptions/cancel',
      { userId: 'user-1', stripeSubscriptionId: 'stripe-old' },
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('cree ou met a jour un abonnement depuis un event billing', async () => {
    const plan = makePlan();
    prisma.plan.findUnique.mockResolvedValue(plan);
    prisma.subscription.findUnique.mockResolvedValue(null);
    prisma.subscription.create.mockResolvedValue(makeSubscription());
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 });

    await service.handleBillingEvent('billing.subscription.created', {
      userId: 'user-1',
      planId: 'plan-1',
      stripePriceId: 'price_old',
      stripeSubscriptionId: 'stripe-sub-1',
      status: 'active',
      currentPeriodStart: '2026-01-01T10:00:00.000Z',
      currentPeriodEnd: '2026-02-01T10:00:00.000Z',
    });

    const [updateManyCall] = prisma.subscription.updateMany.mock.calls;
    const [createCall] = prisma.subscription.create.mock.calls;

    expect(updateManyCall[0].where).toMatchObject({
      user_id: 'user-1',
      status: SubscriptionStatus.active,
    });
    expect(createCall[0].data).toMatchObject({
      user_id: 'user-1',
      plan_id: 'plan-1',
      stripe_subscription_id: 'stripe-sub-1',
      status: SubscriptionStatus.active,
    });
  });

  it('enregistre un paiement billing une seule fois', async () => {
    prisma.paymentSubHistory.findUnique.mockResolvedValue(null);
    prisma.subscription.findUnique.mockResolvedValue(makeSubscription());
    prisma.paymentSubHistory.create.mockResolvedValue({
      id: 'pay-1',
      subscription_id: 'sub-1',
      stripe_invoice_id: 'in_1',
      amount: 19.99,
      currency: PaymentCurrency.EUR,
      status: PaymentStatus.paid,
      paid_at: new Date('2026-01-01T10:00:00.000Z'),
      created_at: new Date(),
    });

    await service.handleBillingEvent('billing.payment.succeeded', {
      stripeSubscriptionId: 'stripe-sub-1',
      stripeInvoiceId: 'in_1',
      amount: 19.99,
      currency: 'usd',
      status: 'paid',
      paidAt: '2026-01-01T10:00:00.000Z',
    });

    expect(prisma.paymentSubHistory.create).toHaveBeenCalledWith({
      data: {
        subscription_id: 'sub-1',
        stripe_invoice_id: 'in_1',
        amount: 19.99,
        currency: PaymentCurrency.USD,
        status: PaymentStatus.paid,
        paid_at: new Date('2026-01-01T10:00:00.000Z'),
      },
    });
  });
});
