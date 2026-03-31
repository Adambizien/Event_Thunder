import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CreateTicketCheckoutDto } from './dto/create-ticket-checkout.dto';
import { RabbitmqPublisherService } from './rabbitmq-publisher.service';
import { SyncPlanPriceDto } from './dto/sync-plan-price.dto';
import { readSecret } from '../utils/secret.util';

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
    this.stripeApiKey =
      readSecret('STRIPE_SECRET_KEY') ??
      this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripeWebhookSecret =
      readSecret('STRIPE_WEBHOOK_SECRET') ??
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

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

  async createTicketCheckoutSession(
    dto: CreateTicketCheckoutDto,
  ): Promise<{ sessionId: string; url: string | null }> {
    if (!this.stripe) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY est manquante');
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      dto.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: item.currency.toLowerCase(),
          unit_amount: Math.round(item.unitAmount * 100),
          product_data: {
            name: item.name,
            description: item.description,
            metadata: {
              ticketTypeId: item.ticketTypeId,
              eventId: dto.eventId,
            },
          },
        },
      }));

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      client_reference_id: dto.userId,
      customer_email: dto.customerEmail,
      metadata: {
        userId: dto.userId,
        eventId: dto.eventId,
        customerName: dto.customerName,
        ticketItems: JSON.stringify(dto.items),
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async cancelSubscription(
    stripeSubscriptionId: string,
  ): Promise<{ canceled: boolean; stripeSubscriptionId: string }> {
    if (!this.stripe) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY est manquante');
    }

    const existing =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    if (existing.status === 'canceled') {
      return {
        canceled: true,
        stripeSubscriptionId,
      };
    }

    await this.stripe.subscriptions.cancel(stripeSubscriptionId);

    return {
      canceled: true,
      stripeSubscriptionId,
    };
  }

  async getInvoiceLinks(stripeInvoiceId: string): Promise<{
    hostedInvoiceUrl: string | null;
    invoicePdfUrl: string | null;
  }> {
    if (!this.stripe) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY est manquante');
    }

    const invoice = await this.stripe.invoices.retrieve(stripeInvoiceId);

    return {
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
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
      }
    }

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

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await this.onSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.onInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.onInvoiceFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionCanceled(event.data.object);
        break;
      default:
        this.logger.debug(`Event Stripe ignoré: ${event.type}`);
    }
  }

  private async onSubscriptionCreated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const period = this.extractPeriodFromSubscription(subscription);

    await this.rabbitmqPublisher.publishWithRetry(
      'billing.subscription.created',
      {
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
      },
    );
  }

  private async onSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const period = this.extractPeriodFromSubscription(subscription);

    await this.rabbitmqPublisher.publishWithRetry(
      'billing.subscription.updated',
      {
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
      },
    );
  }

  private async onCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (session.mode === 'subscription') {
      if (!session.subscription) return;
      return;
    }

    if (session.mode !== 'payment') {
      return;
    }

    const stripePaymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    const rawItems = session.metadata?.ticketItems;
    if (!rawItems || !stripePaymentIntentId) {
      return;
    }

    let parsedItems: Array<{
      ticketTypeId?: string;
      name?: string;
      description?: string;
      quantity?: number;
      unitAmount?: number;
      currency?: string;
    }> = [];

    try {
      parsedItems = JSON.parse(rawItems) as typeof parsedItems;
    } catch {
      this.logger.warn('Metadata ticketItems Stripe invalide');
      return;
    }

    await this.rabbitmqPublisher.publishWithRetry('billing.ticket.payment.succeeded', {
      userId: session.metadata?.userId ?? session.client_reference_id,
      eventId: session.metadata?.eventId,
      customerName: session.metadata?.customerName,
      customerEmail: session.customer_details?.email ?? session.customer_email,
      stripePaymentIntentId,
      stripeCheckoutSessionId: session.id,
      currency: (session.currency ?? 'eur').toUpperCase(),
      amountTotal: (session.amount_total ?? 0) / 100,
      items: parsedItems,
    });
  }

  private async onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = this.extractSubscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) return;

    const period = invoice.lines.data[0]?.period;
    await this.rabbitmqPublisher.publishWithRetry('billing.payment.succeeded', {
      stripeSubscriptionId,
      stripeInvoiceId: invoice.id,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdfUrl: invoice.invoice_pdf,
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: (invoice.currency ?? 'eur').toUpperCase(),
      status: 'paid',
      description: invoice.description,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : new Date().toISOString(),
    });

    if (period?.start && period?.end) {
      await this.rabbitmqPublisher.publishWithRetry(
        'billing.subscription.renewed',
        {
          stripeSubscriptionId,
          status: 'active',
          currentPeriodStart: new Date(period.start * 1000).toISOString(),
          currentPeriodEnd: new Date(period.end * 1000).toISOString(),
        },
      );
    }
  }

  private async onInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = this.extractSubscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) return;

    await this.rabbitmqPublisher.publishWithRetry('billing.payment.failed', {
      stripeSubscriptionId,
      stripeInvoiceId: invoice.id,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdfUrl: invoice.invoice_pdf,
      amount: (invoice.amount_due ?? 0) / 100,
      currency: (invoice.currency ?? 'eur').toUpperCase(),
      status: 'failed',
      description: invoice.description,
      paidAt: new Date().toISOString(),
    });
  }

  private async onSubscriptionCanceled(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    await this.rabbitmqPublisher.publishWithRetry(
      'billing.subscription.canceled',
      {
        stripeSubscriptionId: subscription.id,
        status: 'canceled',
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : new Date().toISOString(),
        endedAt: subscription.ended_at
          ? new Date(subscription.ended_at * 1000).toISOString()
          : null,
      },
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