import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlanCurrency, PlanInterval } from '@prisma/client';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

type SubscriptionsServiceMock = {
  createPlan: jest.Mock<Promise<unknown>, [Record<string, unknown>, string?]>;
  updatePlan: jest.Mock<
    Promise<unknown>,
    [string, Record<string, unknown>, string?]
  >;
  getPlans: jest.Mock<Promise<unknown[]>, []>;
  deletePlan: jest.Mock<Promise<unknown>, [string, string?]>;
  createCheckoutSession: jest.Mock<
    Promise<unknown>,
    [Record<string, unknown>, string?]
  >;
  cancelSubscription: jest.Mock<Promise<unknown>, [string, string, string?]>;
  resumeSubscription: jest.Mock<Promise<unknown>, [string, string, string?]>;
  finalizePlanChange: jest.Mock<Promise<unknown>, [string, string?, string?]>;
  getUserSubscriptions: jest.Mock<Promise<unknown[]>, [string]>;
  getAdminSubscriptionsOverview: jest.Mock<Promise<unknown[]>, []>;
  getInvoiceLinks: jest.Mock<Promise<unknown>, [string, string, string?]>;
};

type RequestMock = {
  user?: {
    id?: string;
    role?: string;
  };
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const makeService = (): SubscriptionsServiceMock => ({
  createPlan: createMock<
    Promise<unknown>,
    [Record<string, unknown>, string?]
  >(),
  updatePlan: createMock<
    Promise<unknown>,
    [string, Record<string, unknown>, string?]
  >(),
  getPlans: createMock<Promise<unknown[]>, []>(),
  deletePlan: createMock<Promise<unknown>, [string, string?]>(),
  createCheckoutSession: createMock<
    Promise<unknown>,
    [Record<string, unknown>, string?]
  >(),
  cancelSubscription: createMock<Promise<unknown>, [string, string, string?]>(),
  resumeSubscription: createMock<Promise<unknown>, [string, string, string?]>(),
  finalizePlanChange: createMock<
    Promise<unknown>,
    [string, string?, string?]
  >(),
  getUserSubscriptions: createMock<Promise<unknown[]>, [string]>(),
  getAdminSubscriptionsOverview: createMock<Promise<unknown[]>, []>(),
  getInvoiceLinks: createMock<Promise<unknown>, [string, string, string?]>(),
});

describe('SubscriptionsController', () => {
  let subscriptionsService: SubscriptionsServiceMock;
  let controller: SubscriptionsController;

  beforeEach(() => {
    subscriptionsService = makeService();
    controller = new SubscriptionsController(
      subscriptionsService as unknown as SubscriptionsService,
    );
  });

  it('valide et delegue la creation de plan admin', async () => {
    const dto = {
      name: 'Pro',
      price: 19.99,
      interval: PlanInterval.monthly,
      currency: PlanCurrency.EUR,
      maxEvents: 10,
      maxPosts: 20,
    };
    subscriptionsService.createPlan.mockResolvedValue({ id: 'plan-1' });

    await expect(controller.createPlan(dto, 'Bearer token')).resolves.toEqual({
      id: 'plan-1',
    });

    expect(subscriptionsService.createPlan).toHaveBeenCalledWith(
      dto,
      'Bearer token',
    );
    expect(() =>
      controller.createPlan({ ...dto, price: 0 }, 'Bearer token'),
    ).toThrow(BadRequestException);
  });

  it('protege checkout/cancel/resume par proprietaire ou admin', async () => {
    subscriptionsService.createCheckoutSession.mockResolvedValue({
      sessionId: 'cs_1',
    });
    subscriptionsService.cancelSubscription.mockResolvedValue({
      message: 'cancelled',
    });
    subscriptionsService.resumeSubscription.mockResolvedValue({
      message: 'resumed',
    });

    const req: RequestMock = { user: { id: 'user-1', role: 'User' } };

    await expect(
      controller.createCheckoutSession(
        {
          userId: 'user-1',
          planId: 'plan-1',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel',
        },
        req as never,
        'Bearer token',
      ),
    ).resolves.toEqual({ sessionId: 'cs_1' });

    await expect(
      controller.cancelSubscription(
        { userId: 'user-1', stripeSubscriptionId: 'stripe-sub-1' },
        req as never,
        'Bearer token',
      ),
    ).resolves.toEqual({ message: 'cancelled' });
    await expect(
      controller.resumeSubscription(
        { userId: 'user-1', stripeSubscriptionId: 'stripe-sub-1' },
        req as never,
        'Bearer token',
      ),
    ).resolves.toEqual({ message: 'resumed' });

    expect(() =>
      controller.createCheckoutSession(
        {
          userId: 'user-2',
          planId: 'plan-1',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel',
        },
        req as never,
      ),
    ).toThrow(ForbiddenException);
  });

  it('protege les abonnements utilisateur et les factures', async () => {
    subscriptionsService.getUserSubscriptions.mockResolvedValue([
      { id: 'sub-1' },
    ]);
    subscriptionsService.getInvoiceLinks.mockResolvedValue({
      hostedInvoiceUrl: 'https://stripe.test/invoice',
      invoicePdfUrl: null,
    });

    const req: RequestMock = { user: { id: 'user-1', role: 'User' } };

    await expect(
      controller.getUserSubscriptions('user-1', req as never),
    ).resolves.toEqual([{ id: 'sub-1' }]);
    await expect(
      controller.getInvoiceLinks(
        'in_1',
        req as never,
        'Bearer token',
        'user-1',
      ),
    ).resolves.toEqual({
      hostedInvoiceUrl: 'https://stripe.test/invoice',
      invoicePdfUrl: null,
    });

    expect(() =>
      controller.getUserSubscriptions('user-2', req as never),
    ).toThrow(ForbiddenException);
    expect(() =>
      controller.getInvoiceLinks('in_1', req as never, undefined, 'user-2'),
    ).toThrow(ForbiddenException);
  });

  it('delegue finalisation de changement de plan et overview admin', async () => {
    subscriptionsService.finalizePlanChange.mockResolvedValue({
      message: 'ok',
      canceledCount: 1,
    });
    subscriptionsService.getAdminSubscriptionsOverview.mockResolvedValue([
      { id: 'sub-1' },
    ]);

    await expect(
      controller.finalizePlanChange(
        { userId: 'user-1', activePlanId: 'plan-1' },
        { user: { id: 'admin-1', role: 'Admin' } } as never,
        'Bearer token',
      ),
    ).resolves.toEqual({ message: 'ok', canceledCount: 1 });
    await expect(controller.getAdminSubscriptionsOverview()).resolves.toEqual([
      { id: 'sub-1' },
    ]);

    expect(subscriptionsService.finalizePlanChange).toHaveBeenCalledWith(
      'user-1',
      'plan-1',
      'Bearer token',
    );
  });
});
