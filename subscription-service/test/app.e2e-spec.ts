import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PlanCurrency, PlanInterval } from '@prisma/client';
import { SubscriptionsController } from '../src/subscriptions/subscriptions.controller';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { AdminGuard } from '../src/auth/admin.guard';

type AuthenticatedRequest = { user?: { id: string; role: string } };

describe('Subscription service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const subscriptionsService = {
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    getPlans: jest.fn(),
    deletePlan: jest.fn(),
    createCheckoutSession: jest.fn(),
    cancelSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
    finalizePlanChange: jest.fn(),
    getUserSubscriptions: jest.fn(),
    getAdminSubscriptionsOverview: jest.fn(),
    getInvoiceLinks: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        { provide: SubscriptionsService, useValue: subscriptionsService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
          req.user = {
            id: 'user-1',
            role: 'User',
          };
          return true;
        },
      })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns public subscription plans', async () => {
    subscriptionsService.getPlans.mockResolvedValue([
      { id: 'plan-1', name: 'Starter', price: 9 },
    ]);

    await request(httpServer)
      .get('/api/subscriptions/plans')
      .expect(200)
      .expect([{ id: 'plan-1', name: 'Starter', price: 9 }]);
  });

  it('creates an admin subscription plan with validated values', async () => {
    const payload = {
      name: 'Pro',
      price: 29,
      interval: PlanInterval.monthly,
      currency: PlanCurrency.EUR,
      maxEvents: 10,
      maxPosts: 20,
      displayOrder: 1,
    };
    subscriptionsService.createPlan.mockResolvedValue({
      id: 'plan-2',
      ...payload,
    });

    await request(httpServer)
      .post('/api/subscriptions/plans')
      .set('Authorization', 'Bearer admin-token')
      .send(payload)
      .expect(201)
      .expect({ id: 'plan-2', ...payload });

    expect(subscriptionsService.createPlan).toHaveBeenCalledWith(
      payload,
      'Bearer admin-token',
    );
  });

  it('rejects checkout for another user', async () => {
    await request(httpServer)
      .post('/api/subscriptions/checkout-session')
      .send({
        userId: 'user-2',
        planId: 'plan-1',
        successUrl: 'https://event-thunder.test/success',
        cancelUrl: 'https://event-thunder.test/cancel',
      })
      .expect(403);
  });
});
