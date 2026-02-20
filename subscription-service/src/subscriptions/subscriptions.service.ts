import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanInterval, PlanName } from './entities/plan.entity';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import {
  PaymentCurrency,
  PaymentStatus,
  PaymentSubHistory,
} from './entities/payment-sub-history.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface BillingEventPayload {
  userId?: string;
  planId?: string;
  stripePriceId?: string;
  stripeSubscriptionId?: string;
  stripeInvoiceId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  description?: string;
  paidAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  canceledAt?: string;
  endedAt?: string | null;
}

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly billingServiceUrl: string;

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PaymentSubHistory)
    private readonly paymentHistoryRepository: Repository<PaymentSubHistory>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.billingServiceUrl =
      this.configService.get<string>('BILLING_SERVICE_URL') ??
      'http://billing-service:3000';
  }

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  async createPlan(dto: CreatePlanDto): Promise<Plan> {
    const stripePriceId =
      dto.stripePriceId ??
      (await this.syncPlanPriceWithBilling({
        name: dto.name,
        price: dto.price,
        interval: dto.interval,
      }));

    const entity = this.planRepository.create({
      name: dto.name,
      price: dto.price,
      interval: dto.interval,
      stripe_price_id: stripePriceId,
      max_events: dto.maxEvents,
    });
    return this.planRepository.save(entity);
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan introuvable');
    }

    const nextName = dto.name ?? plan.name;
    const nextPrice = dto.price ?? Number(plan.price);
    const nextInterval = dto.interval ?? plan.interval;
    const nextMaxEvents = dto.maxEvents ?? plan.max_events;

    const priceOrIntervalChanged =
      dto.price !== undefined ||
      dto.interval !== undefined ||
      dto.name !== undefined;

    if (priceOrIntervalChanged) {
      plan.stripe_price_id = await this.syncPlanPriceWithBilling({
        planId: plan.id,
        name: nextName,
        price: nextPrice,
        interval: nextInterval,
      });
    }

    plan.name = nextName;
    plan.price = nextPrice;
    plan.interval = nextInterval;
    plan.max_events = nextMaxEvents;

    return this.planRepository.save(plan);
  }

  async getPlans(): Promise<Plan[]> {
    return this.planRepository.find({ order: { created_at: 'ASC' } });
  }

  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    const plan = await this.planRepository.findOne({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundException('Plan introuvable');
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.billingServiceUrl}/api/billing/subscriptions/checkout-session`,
        {
          userId: dto.userId,
          planId: plan.id,
          stripePriceId: plan.stripe_price_id,
          successUrl: dto.successUrl,
          cancelUrl: dto.cancelUrl,
          customerEmail: dto.customerEmail,
          stripeCustomerId: dto.stripeCustomerId,
        },
      ),
    );
    const data = (response as unknown as Record<string, unknown>)
      .data as Record<string, unknown>;

    return data;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { user_id: userId },
      relations: ['plan', 'payments'],
      order: { created_at: 'DESC' },
    });
  }

  async handleBillingEvent(routingKey: string, payload: BillingEventPayload) {
    switch (routingKey) {
      case 'billing.subscription.created':
        await this.handleSubscriptionCreated(payload);
        break;
      case 'billing.subscription.renewed':
        await this.handleSubscriptionRenewed(payload);
        break;
      case 'billing.subscription.updated':
        await this.handleSubscriptionUpdated(payload);
        break;
      case 'billing.subscription.canceled':
        await this.handleSubscriptionCanceled(payload);
        break;
      case 'billing.payment.succeeded':
      case 'billing.payment.failed':
        await this.handlePaymentEvent(payload);
        break;
      default:
        this.logger.debug(`Routing key ignorée: ${routingKey}`);
    }
  }

  private async handleSubscriptionCreated(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId || !payload.userId) {
      this.logger.warn('Event billing.subscription.created incomplet');
      return;
    }

    const plan = await this.resolvePlan(payload.planId, payload.stripePriceId);
    if (!plan) {
      this.logger.warn(
        `Plan inconnu pour subscription.created (planId=${payload.planId}, stripePriceId=${payload.stripePriceId})`,
      );
      return;
    }

    const existing = await this.subscriptionRepository.findOne({
      where: { stripe_subscription_id: payload.stripeSubscriptionId },
    });

    const subscription = existing
      ? existing
      : this.subscriptionRepository.create({
          user_id: payload.userId,
          stripe_subscription_id: payload.stripeSubscriptionId,
        });

    subscription.user_id = payload.userId;
    subscription.plan_id = plan.id;
    subscription.status =
      payload.status === (SubscriptionStatus.Canceled as string)
        ? SubscriptionStatus.Canceled
        : SubscriptionStatus.Active;
    subscription.current_period_start = this.toDate(payload.currentPeriodStart);
    subscription.current_period_end = this.toDate(payload.currentPeriodEnd);
    subscription.canceled_at = this.toDate(payload.canceledAt);
    subscription.ended_at = this.toDate(payload.endedAt);

    await this.subscriptionRepository.save(subscription);
    this.logger.log(
      `Subscription créée/mise à jour depuis event billing.subscription.created: ${subscription.stripe_subscription_id}`,
    );
  }

  private async handleSubscriptionUpdated(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId) return;

    let subscription = await this.subscriptionRepository.findOne({
      where: { stripe_subscription_id: payload.stripeSubscriptionId },
    });

    if (!subscription) {
      if (!payload.userId) {
        this.logger.warn(
          `Subscription absente pour updated sans userId: ${payload.stripeSubscriptionId}`,
        );
        return;
      }

      subscription = this.subscriptionRepository.create({
        user_id: payload.userId,
        stripe_subscription_id: payload.stripeSubscriptionId,
      });
    }

    if (payload.userId) {
      subscription.user_id = payload.userId;
    }

    const plan = await this.resolvePlan(payload.planId, payload.stripePriceId);
    if (plan) {
      subscription.plan_id = plan.id;
    }

    subscription.status =
      payload.status === (SubscriptionStatus.Canceled as string)
        ? SubscriptionStatus.Canceled
        : SubscriptionStatus.Active;
    subscription.current_period_start = this.toDate(payload.currentPeriodStart);
    subscription.current_period_end = this.toDate(payload.currentPeriodEnd);
    subscription.canceled_at = this.toDate(payload.canceledAt);
    subscription.ended_at = this.toDate(payload.endedAt);

    await this.subscriptionRepository.save(subscription);
    this.logger.log(
      `Subscription mise à jour depuis event billing.subscription.updated: ${subscription.stripe_subscription_id}`,
    );
  }

  private async handleSubscriptionRenewed(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripe_subscription_id: payload.stripeSubscriptionId },
    });
    if (!subscription) return;

    subscription.status = SubscriptionStatus.Active;
    subscription.current_period_start = this.toDate(payload.currentPeriodStart);
    subscription.current_period_end = this.toDate(payload.currentPeriodEnd);
    subscription.canceled_at = null;
    subscription.ended_at = null;

    await this.subscriptionRepository.save(subscription);
    this.logger.log(
      `Subscription renouvelée: ${subscription.stripe_subscription_id}`,
    );
  }

  private async handleSubscriptionCanceled(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripe_subscription_id: payload.stripeSubscriptionId },
    });
    if (!subscription) return;

    subscription.status = SubscriptionStatus.Canceled;
    subscription.canceled_at = this.toDate(payload.canceledAt) ?? new Date();
    subscription.ended_at = this.toDate(payload.endedAt);

    await this.subscriptionRepository.save(subscription);
    this.logger.log(
      `Subscription annulée: ${subscription.stripe_subscription_id}`,
    );
  }

  private async handlePaymentEvent(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId || !payload.stripeInvoiceId) {
      this.logger.warn('Event payment incomplet');
      return;
    }

    const existing = await this.paymentHistoryRepository.findOne({
      where: { stripe_invoice_id: payload.stripeInvoiceId },
    });
    if (existing) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripe_subscription_id: payload.stripeSubscriptionId },
    });
    if (!subscription) {
      this.logger.warn(
        `Subscription inconnue pour paiement: ${payload.stripeSubscriptionId}`,
      );
      return;
    }

    const payment = this.paymentHistoryRepository.create({
      subscription_id: subscription.id,
      stripe_invoice_id: payload.stripeInvoiceId,
      amount: payload.amount ?? 0,
      currency: this.toPaymentCurrency(payload.currency),
      status:
        payload.status === (PaymentStatus.Failed as string)
          ? PaymentStatus.Failed
          : PaymentStatus.Paid,
      description: payload.description as string | null,
      paid_at: this.toDate(payload.paidAt),
    });

    await this.paymentHistoryRepository.save(payment);
    this.logger.log(
      `Paiement enregistré: invoice=${payment.stripe_invoice_id}, subscription=${payload.stripeSubscriptionId}, status=${payment.status}`,
    );
  }

  private toDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toPaymentCurrency(value?: string): PaymentCurrency {
    const normalized = (value ?? 'EUR').toUpperCase();
    return normalized === (PaymentCurrency.USD as string)
      ? PaymentCurrency.USD
      : PaymentCurrency.EUR;
  }

  private async seedDefaultPlans() {
    const existing = await this.planRepository.count();
    if (existing > 0) return;

    const defaults = this.planRepository.create([
      {
        name: PlanName.Free,
        price: 0,
        interval: PlanInterval.Monthly,
        stripe_price_id: 'price_free_placeholder',
        max_events: 0,
      },
      {
        name: PlanName.Pro,
        price: 29,
        interval: PlanInterval.Monthly,
        stripe_price_id: 'price_pro_placeholder',
        max_events: 2,
      },
      {
        name: PlanName.Premium,
        price: 199,
        interval: PlanInterval.Monthly,
        stripe_price_id: 'price_premium_placeholder',
        max_events: -1,
      },
    ]);

    await this.planRepository.save(defaults);
  }

  private async resolvePlan(
    planId?: string,
    stripePriceId?: string,
  ): Promise<Plan | null> {
    if (planId && this.isUuid(planId)) {
      const byId = await this.planRepository.findOne({ where: { id: planId } });
      if (byId) return byId;
    }

    if (stripePriceId) {
      const byStripe = await this.planRepository.findOne({
        where: { stripe_price_id: stripePriceId },
      });
      if (byStripe) return byStripe;
    }

    return null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private async syncPlanPriceWithBilling(input: {
    planId?: string;
    name: string;
    price: number;
    interval: PlanInterval;
  }): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.billingServiceUrl}/api/billing/plans/sync-price`,
        {
          planId: input.planId,
          name: input.name,
          price: input.price,
          interval: input.interval,
        },
      ),
    );
    const data = (response as unknown as Record<string, unknown>)
      .data as Record<string, unknown>;

    return data.stripePriceId as string;
  }
}
