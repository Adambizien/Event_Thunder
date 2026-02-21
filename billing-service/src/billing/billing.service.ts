import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { RabbitmqPublisherService } from './rabbitmq-publisher.service';
import { SyncPlanPriceDto } from './dto/sync-plan-price.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripeApiKey?: string;
  private readonly stripeWebhookSecret?: string;
  private readonly stripe?: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly rabbitmqPublisher: RabbitmqPublisherService,
  ) {
    this.stripeApiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripeWebhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (this.stripeApiKey) {
      this.stripe = new Stripe(this.stripeApiKey);
    }
  }

  async createSubscriptionCheckoutSession(
    dto: CreateSubscriptionCheckoutDto,
  ): Promise<{ sessionId: string; url: string | null }> {
    if (!this.stripe) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY est manquante');
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: dto.stripePriceId, quantity: 1 }],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      client_reference_id: dto.userId,
      customer: dto.stripeCustomerId,
      customer_email: dto.stripeCustomerId ? undefined : dto.customerEmail,
      metadata: {
        userId: dto.userId,
        planId: dto.planId,
      },
      subscription_data: {
        metadata: {
          userId: dto.userId,
          planId: dto.planId,
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async syncPlanPrice(
    dto: SyncPlanPriceDto,
  ): Promise<{ stripePriceId: string; stripeProductId: string }> {
    if (!this.stripe) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY est manquante');
    }

    const price = await this.stripe.prices.create({
      unit_amount: Math.round(dto.price * 100),
      currency: dto.currency ?? 'eur',
      recurring: {
        interval: dto.interval === 'yearly' ? 'year' : 'month',
      },
      product_data: {
        name: dto.name,
        metadata: {
          planId: dto.planId ?? '',
        },
      },
      metadata: {
        planId: dto.planId ?? '',
      },
    });

    const stripeProductId =
      typeof price.product === 'string' ? price.product : price.product?.id;

    return {
      stripePriceId: price.id,
      stripeProductId: stripeProductId ?? '',
    };
  }

  async archivePlanPrice(
    stripePriceId: string,
  ): Promise<{ archived: boolean; stripePriceId: string }> {
    if (!this.stripe) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY est manquante');
    }

    const price = await this.stripe.prices.retrieve(stripePriceId);
    const stripeProductId =
      typeof price.product === 'string' ? price.product : price.product?.id;

    if (stripeProductId) {
      const product = await this.stripe.products.retrieve(stripeProductId);
      const defaultPriceId =
        typeof product.default_price === 'string'
          ? product.default_price
          : product.default_price?.id;

      if (defaultPriceId === stripePriceId) {
        await this.stripe.products.update(stripeProductId, {
          default_price: '',
        });
      }
    }

    await this.stripe.prices.update(stripePriceId, { active: false });

    if (stripeProductId) {
      const remainingActivePrices = await this.stripe.prices.list({
        product: stripeProductId,
        active: true,
        limit: 1,
      });

      if (remainingActivePrices.data.length === 0) {
        await this.stripe.products.update(stripeProductId, {
          active: false,
        });
        this.logger.log(`Stripe product désactivé: ${stripeProductId}`);
      }
    }

    this.logger.log(`Stripe price archivé: ${stripePriceId}`);

    return {
      archived: true,
      stripePriceId,
    };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.stripe || !this.stripeWebhookSecret) {
      throw new InternalServerErrorException(
        'Configuration Stripe webhook manquante',
      );
    }

    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.stripeWebhookSecret,
      );
    } catch {
      throw new BadRequestException('Signature Stripe invalide');
    }
  }

  handleWebhookEvent(event: Stripe.Event) {
    this.logger.log(`Webhook Stripe reçu: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        this.onCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        this.onSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        this.onSubscriptionUpdated(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        this.onInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        this.onInvoiceFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        this.onSubscriptionCanceled(event.data.object);
        break;
      default:
        this.logger.debug(`Event Stripe ignoré: ${event.type}`);
    }
  }

  private onSubscriptionCreated(subscription: Stripe.Subscription) {
    const period = this.extractPeriodFromSubscription(subscription);

    this.rabbitmqPublisher.publish('billing.subscription.created', {
      userId: subscription.metadata?.userId,
      planId: subscription.metadata?.planId,
      stripePriceId: this.extractPriceIdFromSubscription(subscription),
      stripeSubscriptionId: subscription.id,
      status: this.mapSubscriptionStatus(subscription.status),
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      endedAt: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : null,
    });

    this.logger.log(
      `Event publié: billing.subscription.created (subscription=${subscription.id})`,
    );
  }

  private onSubscriptionUpdated(subscription: Stripe.Subscription) {
    const period = this.extractPeriodFromSubscription(subscription);

    this.rabbitmqPublisher.publish('billing.subscription.updated', {
      userId: subscription.metadata?.userId,
      planId: subscription.metadata?.planId,
      stripePriceId: this.extractPriceIdFromSubscription(subscription),
      stripeSubscriptionId: subscription.id,
      status: this.mapSubscriptionStatus(subscription.status),
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      endedAt: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : null,
    });

    this.logger.log(
      `Event publié: billing.subscription.updated (subscription=${subscription.id})`,
    );
  }

  private onCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription' || !session.subscription) return;

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

    this.logger.log(
      `Checkout session complétée: session=${session.id}, subscription=${stripeSubscriptionId}`,
    );
  }

  private onInvoicePaid(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = this.extractSubscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) return;

    const period = invoice.lines.data[0]?.period;
    this.rabbitmqPublisher.publish('billing.payment.succeeded', {
      stripeSubscriptionId,
      stripeInvoiceId: invoice.id,
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: (invoice.currency ?? 'eur').toUpperCase(),
      status: 'paid',
      description: invoice.description,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : new Date().toISOString(),
    });

    this.logger.log(
      `Event publié: billing.payment.succeeded (invoice=${invoice.id}, subscription=${stripeSubscriptionId})`,
    );

    if (period?.start && period?.end) {
      this.rabbitmqPublisher.publish('billing.subscription.renewed', {
        stripeSubscriptionId,
        status: 'active',
        currentPeriodStart: new Date(period.start * 1000).toISOString(),
        currentPeriodEnd: new Date(period.end * 1000).toISOString(),
      });

      this.logger.log(
        `Event publié: billing.subscription.renewed (subscription=${stripeSubscriptionId})`,
      );
    }
  }

  private onInvoiceFailed(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = this.extractSubscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) return;

    this.rabbitmqPublisher.publish('billing.payment.failed', {
      stripeSubscriptionId,
      stripeInvoiceId: invoice.id,
      amount: (invoice.amount_due ?? 0) / 100,
      currency: (invoice.currency ?? 'eur').toUpperCase(),
      status: 'failed',
      description: invoice.description,
      paidAt: new Date().toISOString(),
    });

    this.logger.log(
      `Event publié: billing.payment.failed (invoice=${invoice.id}, subscription=${stripeSubscriptionId})`,
    );
  }

  private onSubscriptionCanceled(subscription: Stripe.Subscription) {
    this.rabbitmqPublisher.publish('billing.subscription.canceled', {
      stripeSubscriptionId: subscription.id,
      status: 'canceled',
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      endedAt: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : null,
    });

    this.logger.log(
      `Event publié: billing.subscription.canceled (subscription=${subscription.id})`,
    );
  }

  private extractSubscriptionIdFromInvoice(
    invoice: Stripe.Invoice,
  ): string | undefined {
    const legacySubscription = (
      invoice as Stripe.Invoice & {
        subscription?: string | { id: string };
      }
    ).subscription;

    if (typeof legacySubscription === 'string') return legacySubscription;
    if (legacySubscription?.id) return legacySubscription.id;

    const parentSubscription = (
      invoice as Stripe.Invoice & {
        parent?: {
          subscription_details?: {
            subscription?: string;
          };
        };
      }
    ).parent?.subscription_details?.subscription;

    return parentSubscription;
  }

  private extractPriceIdFromSubscription(
    subscription: Stripe.Subscription,
  ): string | undefined {
    return subscription.items.data[0]?.price?.id;
  }

  private extractPeriodFromSubscription(subscription: Stripe.Subscription): {
    start?: string;
    end?: string;
  } {
    const item = subscription.items.data[0];

    return {
      start: item?.current_period_start
        ? new Date(item.current_period_start * 1000).toISOString()
        : undefined,
      end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : undefined,
    };
  }

  private mapSubscriptionStatus(status: string): 'active' | 'canceled' {
    return status === 'canceled' ? 'canceled' : 'active';
  }
}
