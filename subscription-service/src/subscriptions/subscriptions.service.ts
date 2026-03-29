import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentCurrency,
  PaymentStatus,
  PlanCurrency,
  PlanInterval,
  PlanLimitPeriod,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

interface BillingEventPayload {
  userId?: string;
  planId?: string;
  stripePriceId?: string;
  stripeSubscriptionId?: string;
  stripeInvoiceId?: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
  paidAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  canceledAt?: string;
  endedAt?: string | null;
}

type PlanResponse = {
  id: string;
  name: string;
  price: number;
  interval: PlanInterval;
  currency: PlanCurrency;
  stripePriceId: string;
  maxEvents: number;
  maxPosts: number;
  maxEventsPeriod: PlanLimitPeriod;
  maxPostsPeriod: PlanLimitPeriod;
  displayOrder: number;
  description: string | null;
  createdAt: Date;
};

type SubscriptionResponse = {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  plan: PlanModel;
  payments: PaymentModel[];
};

type PlanModel = {
  id: string;
  name: string;
  price: number;
  interval: PlanInterval;
  currency: PlanCurrency;
  stripe_price_id: string;
  max_events: number;
  max_posts: number;
  max_events_period: PlanLimitPeriod;
  max_posts_period: PlanLimitPeriod;
  display_order: number;
  description: string | null;
  created_at: Date;
};

type SubscriptionModel = {
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

type PaymentModel = {
  id: string;
  subscription_id: string;
  stripe_invoice_id: string;
  amount: number;
  currency: PaymentCurrency;
  status: PaymentStatus;
  paid_at: Date | null;
  created_at: Date;
};

type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{
  include: { plan: true; payments: true };
}>;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly billingServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.billingServiceUrl =
      this.configService.get<string>('BILLING_SERVICE_URL') ??
      'http://billing-service:3000';
  }

  private toPlanModel(plan: {
    id: string;
    name: string;
    price: unknown;
    interval: string;
    currency: string;
    stripe_price_id: string;
    max_events: number;
    max_posts: number;
    max_events_period: string;
    max_posts_period: string;
    display_order: number;
    description: string | null;
    created_at: Date;
  }): PlanModel {
    return {
      id: plan.id,
      name: plan.name,
      price: Number(plan.price),
      interval: plan.interval as PlanInterval,
      currency: plan.currency as PlanCurrency,
      stripe_price_id: plan.stripe_price_id,
      max_events: plan.max_events,
      max_posts: plan.max_posts,
      max_events_period: plan.max_events_period as PlanLimitPeriod,
      max_posts_period: plan.max_posts_period as PlanLimitPeriod,
      display_order: plan.display_order,
      description: plan.description,
      created_at: plan.created_at,
    };
  }

  private toSubscriptionModel(subscription: {
    id: string;
    user_id: string;
    plan_id: string;
    stripe_subscription_id: string;
    status: string;
    current_period_start: Date | null;
    current_period_end: Date | null;
    canceled_at: Date | null;
    ended_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }): SubscriptionModel {
    return {
      id: subscription.id,
      user_id: subscription.user_id,
      plan_id: subscription.plan_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
      status: subscription.status as SubscriptionStatus,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      canceled_at: subscription.canceled_at,
      ended_at: subscription.ended_at,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
    };
  }

  private toPaymentModel(payment: {
    id: string;
    subscription_id: string;
    stripe_invoice_id: string;
    amount: unknown;
    currency: string;
    status: string;
    paid_at: Date | null;
    created_at: Date;
  }): PaymentModel {
    return {
      id: payment.id,
      subscription_id: payment.subscription_id,
      stripe_invoice_id: payment.stripe_invoice_id,
      amount: Number(payment.amount),
      currency: payment.currency as PaymentCurrency,
      status: payment.status as PaymentStatus,
      paid_at: payment.paid_at,
      created_at: payment.created_at,
    };
  }

  private toPlanResponse(plan: PlanModel): PlanResponse {
    return {
      id: plan.id,
      name: plan.name,
      price: Number(plan.price),
      interval: plan.interval,
      currency: plan.currency,
      stripePriceId: plan.stripe_price_id,
      maxEvents: plan.max_events,
      maxPosts: plan.max_posts,
      maxEventsPeriod: plan.max_events_period,
      maxPostsPeriod: plan.max_posts_period,
      displayOrder: plan.display_order,
      description: plan.description,
      createdAt: plan.created_at,
    };
  }

  private toSubscriptionResponse(
    subscription: SubscriptionWithRelations,
  ): SubscriptionResponse {
    const subscriptionModel = this.toSubscriptionModel(subscription);

    return {
      id: subscriptionModel.id,
      userId: subscriptionModel.user_id,
      planId: subscriptionModel.plan_id,
      stripeSubscriptionId: subscriptionModel.stripe_subscription_id,
      status: subscriptionModel.status,
      currentPeriodStart: subscriptionModel.current_period_start,
      currentPeriodEnd: subscriptionModel.current_period_end,
      canceledAt: subscriptionModel.canceled_at,
      endedAt: subscriptionModel.ended_at,
      createdAt: subscriptionModel.created_at,
      updatedAt: subscriptionModel.updated_at,
      plan: this.toPlanModel(subscription.plan),
      payments: [...subscription.payments]
        .sort(
          (left, right) =>
            right.created_at.getTime() - left.created_at.getTime(),
        )
        .map((payment) => this.toPaymentModel(payment)),
    };
  }

  async createPlan(
    dto: CreatePlanDto,
    authHeader?: string,
  ): Promise<PlanResponse> {
    const stripePriceId =
      dto.stripePriceId ??
      (await this.syncPlanPriceWithBilling(
        {
          name: dto.name,
          price: dto.price,
          interval: dto.interval,
          currency: dto.currency ?? PlanCurrency.EUR,
        },
        authHeader,
      ));

    const saved = await this.prisma.plan.create({
      data: {
        name: dto.name,
        price: dto.price,
        interval: dto.interval,
        currency: dto.currency ?? PlanCurrency.EUR,
        stripe_price_id: stripePriceId,
        max_events: dto.maxEvents,
        max_posts: dto.maxPosts,
        max_events_period: dto.maxEventsPeriod ?? PlanLimitPeriod.monthly,
        max_posts_period: dto.maxPostsPeriod ?? PlanLimitPeriod.monthly,
        display_order: dto.displayOrder ?? 0,
        description: dto.description ?? null,
      },
    });

    return this.toPlanResponse(this.toPlanModel(saved));
  }

  async updatePlan(
    id: string,
    dto: UpdatePlanDto,
    authHeader?: string,
  ): Promise<PlanResponse> {
    const current = await this.prisma.plan.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Plan introuvable');
    }

    const plan = this.toPlanModel(current);

    const nextName = dto.name ?? plan.name;
    const nextPrice = dto.price ?? Number(plan.price);
    const nextInterval = dto.interval ?? plan.interval;
    const nextCurrency = dto.currency ?? plan.currency;
    const nextMaxEvents = dto.maxEvents ?? plan.max_events;
    const nextMaxPosts = dto.maxPosts ?? plan.max_posts;
    const nextMaxEventsPeriod = dto.maxEventsPeriod ?? plan.max_events_period;
    const nextMaxPostsPeriod = dto.maxPostsPeriod ?? plan.max_posts_period;
    const nextDisplayOrder = dto.displayOrder ?? plan.display_order;
    const nextDescription = dto.description ?? plan.description;

    const currentPrice = Number(plan.price);
    const priceOrIntervalChanged =
      nextPrice !== currentPrice ||
      nextInterval !== plan.interval ||
      nextCurrency !== plan.currency;

    let stripePriceId = plan.stripe_price_id;
    const previousStripePriceId = plan.stripe_price_id;
    if (priceOrIntervalChanged) {
      stripePriceId = await this.syncPlanPriceWithBilling(
        {
          planId: plan.id,
          name: nextName,
          price: nextPrice,
          interval: nextInterval,
          currency: nextCurrency,
        },
        authHeader,
      );
    }

    const saved = await this.prisma.plan.update({
      where: { id },
      data: {
        name: nextName,
        price: nextPrice,
        interval: nextInterval,
        currency: nextCurrency,
        max_events: nextMaxEvents,
        max_posts: nextMaxPosts,
        max_events_period: nextMaxEventsPeriod,
        max_posts_period: nextMaxPostsPeriod,
        display_order: nextDisplayOrder,
        description: nextDescription,
        stripe_price_id: stripePriceId,
      },
    });

    const savedPlan = this.toPlanModel(saved);

    if (
      priceOrIntervalChanged &&
      previousStripePriceId &&
      previousStripePriceId !== savedPlan.stripe_price_id
    ) {
      await this.archivePlanPriceWithBilling(
        previousStripePriceId,
        savedPlan.id,
        authHeader,
      );
    }

    return this.toPlanResponse(savedPlan);
  }

  async getPlans(): Promise<PlanResponse[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: { created_at: 'asc' },
    });
    return plans.map((plan) => this.toPlanResponse(this.toPlanModel(plan)));
  }

  async deletePlan(
    id: string,
    authHeader?: string,
  ): Promise<{ message: string }> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan introuvable');
    }

    const planModel = this.toPlanModel(plan);
    if (planModel.stripe_price_id) {
      await this.archivePlanPriceWithBilling(
        planModel.stripe_price_id,
        planModel.id,
        authHeader,
      );
    }

    await this.prisma.plan.delete({ where: { id } });
    return { message: 'Plan supprimé avec succès' };
  }

  async createCheckoutSession(
    dto: CreateCheckoutSessionDto,
    authHeader?: string,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundException('Plan introuvable');
    }

    const planModel = this.toPlanModel(plan);

    await this.ensureUserNotAlreadyActiveOnPlan(dto.userId, dto.planId);

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.billingServiceUrl}/api/billing/subscriptions/checkout-session`,
        {
          userId: dto.userId,
          planId: planModel.id,
          stripePriceId: planModel.stripe_price_id,
          successUrl: dto.successUrl,
          cancelUrl: dto.cancelUrl,
          customerEmail: dto.customerEmail,
          stripeCustomerId: dto.stripeCustomerId,
        },
        {
          headers: authHeader ? { Authorization: authHeader } : undefined,
        },
      ),
    );
    const data = (response as unknown as Record<string, unknown>)
      .data as Record<string, unknown>;

    return data;
  }

  private async ensureUserNotAlreadyActiveOnPlan(
    userId: string,
    targetPlanId: string,
  ) {
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { user_id: userId, status: SubscriptionStatus.active },
    });

    const activeOnTargetPlan = activeSubscriptions.find((subscription) => {
      return subscription.plan_id === targetPlanId;
    });

    if (activeOnTargetPlan) {
      throw new BadRequestException('Utilisateur déjà abonné à ce plan');
    }
  }

  async getUserSubscriptions(userId: string): Promise<SubscriptionResponse[]> {
    const subscriptions = (await this.prisma.subscription.findMany({
      where: { user_id: userId },
      include: {
        plan: true,
        payments: true,
      },
      orderBy: { created_at: 'desc' },
    })) as SubscriptionWithRelations[];

    return subscriptions.map((subscription) =>
      this.toSubscriptionResponse(subscription),
    );
  }

  async getAdminSubscriptionsOverview(): Promise<SubscriptionResponse[]> {
    const subscriptions = (await this.prisma.subscription.findMany({
      include: {
        plan: true,
        payments: true,
      },
      orderBy: { created_at: 'desc' },
    })) as SubscriptionWithRelations[];

    return subscriptions.map((subscription) =>
      this.toSubscriptionResponse(subscription),
    );
  }

  async getInvoiceLinks(
    userId: string,
    stripeInvoiceId: string,
    authHeader?: string,
  ): Promise<{
    hostedInvoiceUrl: string | null;
    invoicePdfUrl: string | null;
  }> {
    const payment = await this.prisma.paymentSubHistory.findUnique({
      where: { stripe_invoice_id: stripeInvoiceId },
      include: {
        subscription: true,
      },
    });

    if (!payment || payment.subscription.user_id !== userId) {
      throw new NotFoundException('Facture introuvable');
    }

    const response = await firstValueFrom(
      this.httpService.get(
        `${this.billingServiceUrl}/api/billing/invoices/${encodeURIComponent(stripeInvoiceId)}`,
        {
          headers: authHeader ? { Authorization: authHeader } : undefined,
        },
      ),
    );

    const data = (response as unknown as Record<string, unknown>)
      .data as Record<string, unknown>;

    return {
      hostedInvoiceUrl:
        typeof data.hostedInvoiceUrl === 'string'
          ? data.hostedInvoiceUrl
          : null,
      invoicePdfUrl:
        typeof data.invoicePdfUrl === 'string' ? data.invoicePdfUrl : null,
    };
  }

  async cancelSubscription(
    userId: string,
    stripeSubscriptionId: string,
    authHeader?: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.subscription.findFirst({
      where: {
        user_id: userId,
        stripe_subscription_id: stripeSubscriptionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Abonnement introuvable');
    }

    const subscription = this.toSubscriptionModel(existing);
    if (subscription.status === SubscriptionStatus.canceled) {
      return { message: 'Abonnement déjà annulé' };
    }

    await this.cancelSubscriptionWithBilling(
      userId,
      stripeSubscriptionId,
      authHeader,
    );

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.canceled,
        canceled_at: new Date(),
        ended_at: new Date(),
      },
    });

    return { message: 'Abonnement annulé avec succès' };
  }

  async finalizePlanChange(
    userId: string,
    activePlanId?: string,
    authHeader?: string,
  ): Promise<{ message: string; canceledCount: number }> {
    let activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        user_id: userId,
        status: SubscriptionStatus.active,
      },
      orderBy: { created_at: 'desc' },
    });

    let activeOnTargetPlan = activePlanId
      ? activeSubscriptions.filter((sub) => sub.plan_id === activePlanId)
      : [];

    for (
      let attempt = 0;
      attempt < 20 &&
      (activeSubscriptions.length === 0 ||
        (Boolean(activePlanId) && activeOnTargetPlan.length === 0));
      attempt += 1
    ) {
      await this.wait(500);
      activeSubscriptions = await this.prisma.subscription.findMany({
        where: {
          user_id: userId,
          status: SubscriptionStatus.active,
        },
        orderBy: { created_at: 'desc' },
      });

      activeOnTargetPlan = activePlanId
        ? activeSubscriptions.filter((sub) => sub.plan_id === activePlanId)
        : [];
    }

    if (activeSubscriptions.length === 0) {
      return {
        message:
          "Aucun abonnement actif n'est encore visible. Réessayez dans quelques secondes.",
        canceledCount: 0,
      };
    }

    const subscriptionToKeepRaw =
      activeOnTargetPlan[0] ?? activeSubscriptions[0] ?? null;

    if (!subscriptionToKeepRaw) {
      return {
        message: 'Aucun abonnement actif à consolider',
        canceledCount: 0,
      };
    }

    if (activePlanId && activeOnTargetPlan.length === 0) {
      this.logger.warn(
        `Plan actif cible non trouvé pour user=${userId}, plan=${activePlanId}; conservation du plus récent abonnement actif`,
      );
    }

    const subscriptionToKeep = this.toSubscriptionModel(subscriptionToKeepRaw);
    const toCancelActive = activeSubscriptions.filter(
      (sub) => sub.id !== subscriptionToKeep.id,
    );

    const recentCancellationCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const recentlyCanceled = await this.prisma.subscription.findMany({
      where: {
        user_id: userId,
        status: SubscriptionStatus.canceled,
        canceled_at: { gte: recentCancellationCutoff },
        id: { not: subscriptionToKeep.id },
      },
      orderBy: { updated_at: 'desc' },
    });

    const toCancelById = new Map<string, SubscriptionModel>();
    for (const sub of [...toCancelActive, ...recentlyCanceled]) {
      const subscription = this.toSubscriptionModel(sub);
      if (
        subscription.stripe_subscription_id ===
        subscriptionToKeep.stripe_subscription_id
      ) {
        continue;
      }
      toCancelById.set(subscription.id, subscription);
    }

    let canceledCount = 0;
    for (const subscription of toCancelById.values()) {
      await this.cancelSubscriptionWithBilling(
        userId,
        subscription.stripe_subscription_id,
        authHeader,
      );
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.canceled,
          canceled_at: new Date(),
          ended_at: new Date(),
        },
      });
      canceledCount += 1;
    }

    return {
      message: 'Changement de plan finalisé',
      canceledCount,
    };
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

    const userId = payload.userId;
    const stripeSubscriptionId = payload.stripeSubscriptionId;

    const plan = await this.resolvePlan(payload.planId, payload.stripePriceId);
    if (!plan) {
      this.logger.warn(
        `Plan inconnu pour subscription.created (planId=${payload.planId}, stripePriceId=${payload.stripePriceId})`,
      );
      return;
    }

    const targetStatus =
      payload.status === (SubscriptionStatus.canceled as string)
        ? SubscriptionStatus.canceled
        : SubscriptionStatus.active;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { stripe_subscription_id: stripeSubscriptionId },
      });

      if (targetStatus === SubscriptionStatus.active) {
        await tx.subscription.updateMany({
          where: {
            user_id: userId,
            status: SubscriptionStatus.active,
            ...(existing ? { id: { not: existing.id } } : {}),
          },
          data: {
            status: SubscriptionStatus.canceled,
            canceled_at: new Date(),
            ended_at: new Date(),
          },
        });
      }

      if (!existing) {
        await tx.subscription.create({
          data: {
            user_id: userId,
            plan_id: plan.id,
            stripe_subscription_id: stripeSubscriptionId,
            status: targetStatus,
            current_period_start: this.toDate(payload.currentPeriodStart),
            current_period_end: this.toDate(payload.currentPeriodEnd),
            canceled_at:
              targetStatus === SubscriptionStatus.canceled
                ? this.toDate(payload.canceledAt)
                : null,
            ended_at:
              targetStatus === SubscriptionStatus.canceled
                ? this.toDate(payload.endedAt)
                : null,
          },
        });
      } else {
        await tx.subscription.update({
          where: { id: existing.id },
          data: {
            user_id: userId,
            plan_id: plan.id,
            status: targetStatus,
            current_period_start: this.toDate(payload.currentPeriodStart),
            current_period_end: this.toDate(payload.currentPeriodEnd),
            canceled_at:
              targetStatus === SubscriptionStatus.canceled
                ? this.toDate(payload.canceledAt)
                : null,
            ended_at:
              targetStatus === SubscriptionStatus.canceled
                ? this.toDate(payload.endedAt)
                : null,
          },
        });
      }
    });
  }

  private async handleSubscriptionUpdated(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId) return;

    const stripeSubscriptionId = payload.stripeSubscriptionId;

    let subscription = await this.prisma.subscription.findUnique({
      where: { stripe_subscription_id: stripeSubscriptionId },
    });

    const plan = await this.resolvePlan(payload.planId, payload.stripePriceId);

    const targetStatus =
      payload.status === (SubscriptionStatus.canceled as string)
        ? SubscriptionStatus.canceled
        : SubscriptionStatus.active;

    if (!subscription) {
      if (!payload.userId) {
        this.logger.warn(
          `Subscription absente pour updated sans userId: ${payload.stripeSubscriptionId}`,
        );
        return;
      }

      if (!plan) {
        this.logger.warn(
          `Plan non résolu pour subscription.updated: ${payload.stripeSubscriptionId}`,
        );
        return;
      }

      const userId = payload.userId;

      if (targetStatus === SubscriptionStatus.active) {
        await this.prisma.subscription.updateMany({
          where: {
            user_id: userId,
            status: SubscriptionStatus.active,
          },
          data: {
            status: SubscriptionStatus.canceled,
            canceled_at: new Date(),
            ended_at: new Date(),
          },
        });
      }

      subscription = await this.prisma.subscription.create({
        data: {
          user_id: userId,
          plan_id: plan.id,
          stripe_subscription_id: stripeSubscriptionId,
          status: targetStatus,
          current_period_start: this.toDate(payload.currentPeriodStart),
          current_period_end: this.toDate(payload.currentPeriodEnd),
          canceled_at:
            targetStatus === SubscriptionStatus.canceled
              ? this.toDate(payload.canceledAt)
              : null,
          ended_at:
            targetStatus === SubscriptionStatus.canceled
              ? this.toDate(payload.endedAt)
              : null,
        },
      });
      return;
    }

    const effectiveUserId = payload.userId ?? subscription.user_id;

    await this.prisma.$transaction(async (tx) => {
      if (targetStatus === SubscriptionStatus.active) {
        await tx.subscription.updateMany({
          where: {
            user_id: effectiveUserId,
            status: SubscriptionStatus.active,
            id: { not: subscription.id },
          },
          data: {
            status: SubscriptionStatus.canceled,
            canceled_at: new Date(),
            ended_at: new Date(),
          },
        });
      }

      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          user_id: effectiveUserId,
          plan_id: plan?.id ?? subscription.plan_id,
          status: targetStatus,
          current_period_start: this.toDate(payload.currentPeriodStart),
          current_period_end: this.toDate(payload.currentPeriodEnd),
          canceled_at:
            targetStatus === SubscriptionStatus.canceled
              ? this.toDate(payload.canceledAt)
              : null,
          ended_at:
            targetStatus === SubscriptionStatus.canceled
              ? this.toDate(payload.endedAt)
              : null,
        },
      });
    });
  }

  private async handleSubscriptionRenewed(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripe_subscription_id: payload.stripeSubscriptionId },
    });
    if (!subscription) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: {
          user_id: subscription.user_id,
          status: SubscriptionStatus.active,
          id: { not: subscription.id },
        },
        data: {
          status: SubscriptionStatus.canceled,
          canceled_at: new Date(),
          ended_at: new Date(),
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.active,
          current_period_start: this.toDate(payload.currentPeriodStart),
          current_period_end: this.toDate(payload.currentPeriodEnd),
          canceled_at: null,
          ended_at: null,
        },
      });
    });
  }

  private async handleSubscriptionCanceled(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripe_subscription_id: payload.stripeSubscriptionId },
    });
    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.canceled,
        canceled_at: this.toDate(payload.canceledAt) ?? new Date(),
        ended_at: this.toDate(payload.endedAt),
      },
    });
  }

  private async handlePaymentEvent(payload: BillingEventPayload) {
    if (!payload.stripeSubscriptionId || !payload.stripeInvoiceId) {
      this.logger.warn('Event payment incomplet');
      return;
    }

    const existing = await this.prisma.paymentSubHistory.findUnique({
      where: { stripe_invoice_id: payload.stripeInvoiceId },
    });
    if (existing) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripe_subscription_id: payload.stripeSubscriptionId },
    });
    if (!subscription) {
      this.logger.warn(
        `Subscription inconnue pour paiement: ${payload.stripeSubscriptionId}`,
      );
      return;
    }

    await this.prisma.paymentSubHistory.create({
      data: {
        subscription_id: subscription.id,
        stripe_invoice_id: payload.stripeInvoiceId,
        amount: payload.amount ?? 0,
        currency: this.toPaymentCurrency(payload.currency),
        status:
          payload.status === (PaymentStatus.failed as string)
            ? PaymentStatus.failed
            : PaymentStatus.paid,
        paid_at: this.toDate(payload.paidAt),
      },
    });
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

  private async resolvePlan(
    planId?: string,
    stripePriceId?: string,
  ): Promise<PlanModel | null> {
    if (planId && this.isUuid(planId)) {
      const byId = await this.prisma.plan.findUnique({
        where: { id: planId },
      });
      if (byId) return this.toPlanModel(byId);
    }

    if (stripePriceId) {
      const byStripe = await this.prisma.plan.findUnique({
        where: { stripe_price_id: stripePriceId },
      });
      if (byStripe) return this.toPlanModel(byStripe);
    }

    return null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private async syncPlanPriceWithBilling(
    input: {
      planId?: string;
      name: string;
      price: number;
      interval: PlanInterval;
      currency: PlanCurrency;
    },
    authHeader?: string,
  ): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.billingServiceUrl}/api/billing/plans/sync-price`,
        {
          planId: input.planId,
          name: input.name,
          price: input.price,
          interval: input.interval,
          currency: input.currency.toLowerCase(),
        },
        {
          headers: authHeader ? { Authorization: authHeader } : undefined,
        },
      ),
    );
    const data = (response as unknown as Record<string, unknown>)
      .data as Record<string, unknown>;

    return data.stripePriceId as string;
  }

  private async archivePlanPriceWithBilling(
    stripePriceId: string,
    planId: string,
    authHeader?: string,
  ) {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.billingServiceUrl}/api/billing/plans/archive-price`,
          {
            stripePriceId,
          },
          {
            headers: authHeader ? { Authorization: authHeader } : undefined,
          },
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Impossible d'archiver le Stripe price ${stripePriceId} pour le plan ${planId}`,
      );
      this.logger.debug(
        error instanceof Error ? error.message : 'Erreur inconnue',
      );
    }
  }

  private async cancelSubscriptionWithBilling(
    userId: string,
    stripeSubscriptionId: string,
    authHeader?: string,
  ) {
    await firstValueFrom(
      this.httpService.post(
        `${this.billingServiceUrl}/api/billing/subscriptions/cancel`,
        {
          userId,
          stripeSubscriptionId,
        },
        {
          headers: authHeader ? { Authorization: authHeader } : undefined,
        },
      ),
    );
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
