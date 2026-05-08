import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { BillingController } from '../src/billing/billing.controller';
import { BillingService } from '../src/billing/billing.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { AdminGuard } from '../src/auth/admin.guard';

type AuthenticatedRequest = { user?: { id: string; role: string } };

describe('Billing service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const billingService = {
    createSubscriptionCheckoutSession: jest.fn(),
    createTicketCheckoutSession: jest.fn(),
    refundTicketPayment: jest.fn(),
    cancelSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
    getInvoiceLinks: jest.fn(),
    getTicketPaymentLinks: jest.fn(),
    syncPlanPrice: jest.fn(),
    archivePlanPrice: jest.fn(),
    handleStripeWebhook: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: billingService }],
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

  it('creates a subscription checkout session', async () => {
    const payload = {
      userId: 'user-1',
      planId: 'plan-1',
      stripePriceId: 'price_123',
      successUrl: 'https://event-thunder.test/success',
      cancelUrl: 'https://event-thunder.test/cancel',
      customerEmail: 'user@example.com',
    };
    billingService.createSubscriptionCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.test/session',
    });

    await request(httpServer)
      .post('/api/billing/subscriptions/checkout-session')
      .send(payload)
      .expect(201)
      .expect({ url: 'https://checkout.stripe.test/session' });

    expect(
      billingService.createSubscriptionCheckoutSession,
    ).toHaveBeenCalledWith(payload);
  });

  it('validates ticket checkout payloads before calling Stripe', async () => {
    await request(httpServer)
      .post('/api/billing/tickets/checkout-session')
      .send({ userId: 'user-1' })
      .expect(400);

    expect(billingService.createTicketCheckoutSession).not.toHaveBeenCalled();
  });
});
