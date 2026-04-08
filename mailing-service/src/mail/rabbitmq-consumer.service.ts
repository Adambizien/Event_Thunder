import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { MailService } from './mail.service';

type SubscriptionPaidPayload = {
  customerEmail?: string | null;
  amount?: number;
  currency?: string;
  paidAt?: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
};

type TicketPaymentPayload = {
  userId?: string;
  customerEmail?: string;
  customerName?: string;
  paidAt?: string;
  createdAt?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  amountTotal?: number;
  currency?: string;
  eventId?: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  receiptUrl?: string | null;
  attendees?: Array<{
    ticketTypeId?: string;
    firstname?: string;
    lastname?: string;
    email?: string;
  }>;
  items?: Array<{
    name?: string;
    quantity?: number;
    unitAmount?: number;
  }>;
};

type TicketRefundedPayload = {
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  amount?: number;
  currency?: string;
  reason?: string | null;
  refundedAt?: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  receiptUrl?: string | null;
};

type AuthWelcomePayload = {
  email?: string;
  username?: string;
  activationUrl?: string;
};

type AuthPasswordResetPayload = {
  email?: string;
  resetUrl?: string;
  username?: string;
  expiresInMinutes?: number;
};

@Injectable()
export class RabbitmqConsumerService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(RabbitmqConsumerService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private readonly rabbitUrl: string;
  private readonly exchange: string;
  private readonly queueName: string;
  private readonly ticketingBaseUrl: string;
  private readonly userServiceBaseUrl: string;
  private readonly routingKeys = [
    'billing.payment.succeeded',
    'billing.ticket.payment.succeeded',
    'billing.ticket.payment.refunded',
    'auth.mail.welcome',
    'auth.mail.password-reset',
  ];
  private readonly retryDelayMs: number;
  private reconnectTimer?: NodeJS.Timeout;
  private connecting = false;
  private readonly processedRefundEmailKeys = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.rabbitUrl =
      this.configService.get<string>('RABBITMQ_URL') ?? 'amqp://rabbitmq:5672';
    this.exchange =
      this.configService.get<string>('RABBITMQ_EXCHANGE') ?? 'billing.events';
    this.queueName =
      this.configService.get<string>('RABBITMQ_MAILING_QUEUE') ??
      'mailing-service.billing.events';
    this.ticketingBaseUrl =
      this.configService.get<string>('TICKETING_SERVICE_URL') ??
      'http://ticketing-service:3000';
    this.userServiceBaseUrl =
      this.configService.get<string>('USER_SERVICE_URL') ??
      'http://user-service:3000';
    this.retryDelayMs = Number(
      this.configService.get<string>('RABBITMQ_RETRY_DELAY_MS') ?? 5000,
    );
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    if (this.connecting || this.channel) {
      return;
    }

    this.connecting = true;
    try {
      this.connection = await connect(this.rabbitUrl);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });
      await this.channel.assertQueue(this.queueName, { durable: true });

      for (const routingKey of this.routingKeys) {
        await this.channel.bindQueue(this.queueName, this.exchange, routingKey);
      }

      await this.channel.consume(this.queueName, (message) => {
        void this.handleMessage(message);
      });

      this.connection.on('close', () => {
        this.logger.warn('Connexion RabbitMQ fermee. Reconnexion...');
        this.channel = undefined;
        this.connection = undefined;
        this.scheduleReconnect();
      });

      this.connection.on('error', (error) => {
        this.logger.error(
          'Erreur RabbitMQ consumer mailing',
          error instanceof Error ? error.stack : undefined,
        );
      });
    } catch (error) {
      this.logger.error(
        'Connexion RabbitMQ impossible. Les emails billing ne seront pas consommes.',
        error instanceof Error ? error.stack : undefined,
      );
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connectWithRetry();
    }, this.retryDelayMs);
  }

  private async handleMessage(message: ConsumeMessage | null) {
    if (!message || !this.channel) return;

    try {
      const payload = JSON.parse(message.content.toString()) as Record<
        string,
        unknown
      >;

      if (message.fields.routingKey === 'billing.payment.succeeded') {
        await this.handleSubscriptionPaid(payload as SubscriptionPaidPayload);
      }

      if (message.fields.routingKey === 'billing.ticket.payment.succeeded') {
        await this.handleTicketPayment(payload as TicketPaymentPayload);
      }

      if (message.fields.routingKey === 'billing.ticket.payment.refunded') {
        await this.handleTicketRefunded(payload as TicketRefundedPayload);
      }

      if (message.fields.routingKey === 'auth.mail.welcome') {
        await this.handleAuthWelcome(payload as AuthWelcomePayload);
      }

      if (message.fields.routingKey === 'auth.mail.password-reset') {
        await this.handleAuthPasswordReset(payload as AuthPasswordResetPayload);
      }

      this.channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Event RabbitMQ mailing invalide: ${message.fields.routingKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.channel.ack(message);
    }
  }

  private async handleSubscriptionPaid(payload: SubscriptionPaidPayload) {
    if (!payload.customerEmail) {
      this.logger.warn('billing.payment.succeeded sans customerEmail');
      return;
    }

    const user = await this.fetchUserByEmail(payload.customerEmail);
    const username = this.resolveUsername(
      undefined,
      user?.firstName ?? undefined,
      user?.lastName ?? undefined,
      payload.customerEmail,
    );

    await this.mailService.sendSubscriptionThanks({
      email: payload.customerEmail,
      username,
      amount: payload.amount,
      currency: payload.currency,
      paidAt: payload.paidAt,
      hostedInvoiceUrl: payload.hostedInvoiceUrl,
      invoicePdfUrl: payload.invoicePdfUrl,
    });
  }

  private async handleTicketPayment(payload: TicketPaymentPayload) {
    if (!payload.customerEmail) {
      this.logger.warn('billing.ticket.payment.succeeded sans customerEmail');
      return;
    }

    const items = Array.isArray(payload.items)
      ? payload.items
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            name: String(item.name ?? 'Ticket'),
            quantity: Number(item.quantity ?? 0),
            unitAmount:
              typeof item.unitAmount === 'number' ? item.unitAmount : undefined,
          }))
          .filter((item) => item.quantity > 0)
      : [];

    const ticketCount = items.reduce((total, item) => total + item.quantity, 0);

    const buyerName = (payload.customerName ?? '').trim();
    const [buyerFirstname, ...lastnameParts] = buyerName
      .split(/\s+/)
      .filter(Boolean);
    const buyerLastname = lastnameParts.join(' ') || undefined;

    const tickets = Array.isArray(payload.attendees)
      ? payload.attendees
          .filter((attendee) => attendee && typeof attendee === 'object')
          .map((attendee, index) => ({
            ticketNumber: `ATT-${index + 1}`,
            attendeeLastname: attendee.lastname ?? undefined,
            attendeeFirstname: attendee.firstname ?? undefined,
            attendeeEmail: attendee.email ?? undefined,
            statusLabel: 'Valide',
          }))
      : [];

    const enriched = payload.stripePaymentIntentId
      ? await this.fetchPurchaseByStripePaymentIntentId(
          payload.stripePaymentIntentId,
        )
      : null;

    await this.mailService.sendTicketPurchaseThanks({
      email: payload.customerEmail,
      username: this.resolveUsername(
        payload.customerName,
        enriched?.buyerFirstname,
        enriched?.buyerLastname,
        payload.customerEmail,
      ),
      eventId: enriched?.eventId ?? payload.eventId,
      amountTotal: enriched?.amountTotal ?? payload.amountTotal,
      currency: enriched?.currency ?? payload.currency,
      ticketCount: enriched?.ticketCount ?? ticketCount,
      buyerFirstname: enriched?.buyerFirstname ?? buyerFirstname,
      buyerLastname: enriched?.buyerLastname ?? buyerLastname,
      buyerEmail: enriched?.buyerEmail ?? payload.customerEmail,
      statusLabel: enriched?.statusLabel ?? 'Paiement confirme',
      purchaseDate:
        enriched?.purchaseDate ?? payload.createdAt ?? payload.paidAt,
      purchaseId: enriched?.purchaseId,
      stripePaymentIntentId: payload.stripePaymentIntentId,
      stripeCheckoutSessionId: payload.stripeCheckoutSessionId,
      hostedInvoiceUrl: payload.hostedInvoiceUrl,
      invoicePdfUrl: payload.invoicePdfUrl,
      receiptUrl: payload.receiptUrl,
      items: enriched?.items ?? items,
      tickets: enriched?.tickets ?? tickets,
    });
  }

  private async handleTicketRefunded(payload: TicketRefundedPayload) {
    if (!payload.stripePaymentIntentId) {
      this.logger.warn('billing.ticket.payment.refunded sans stripePaymentIntentId');
      return;
    }

    const dedupeKey =
      payload.stripeRefundId ?? `pi:${payload.stripePaymentIntentId}`;
    if (!this.shouldProcessRefundEmail(dedupeKey)) {
      return;
    }

    const enriched = await this.fetchPurchaseByStripePaymentIntentId(
      payload.stripePaymentIntentId,
    );
    if (!enriched?.buyerEmail) {
      this.logger.warn(
        `billing.ticket.payment.refunded sans email acheteur (${payload.stripePaymentIntentId})`,
      );
      return;
    }

    const fallbackStatus =
      enriched.statusLabel && enriched.statusLabel.trim().length > 0
        ? enriched.statusLabel
        : 'Remboursé';

    await this.mailService.sendTicketRefundedSuccess({
      email: enriched.buyerEmail,
      username: this.resolveUsername(
        undefined,
        enriched.buyerFirstname,
        enriched.buyerLastname,
        enriched.buyerEmail,
      ),
      eventId: enriched.eventId,
      amountTotal:
        typeof payload.amount === 'number' ? payload.amount : enriched.amountTotal,
      currency: payload.currency ?? enriched.currency,
      ticketCount: enriched.ticketCount,
      buyerFirstname: enriched.buyerFirstname,
      buyerLastname: enriched.buyerLastname,
      buyerEmail: enriched.buyerEmail,
      statusLabel: fallbackStatus,
      purchaseDate: payload.refundedAt ?? enriched.purchaseDate,
      purchaseId: enriched.purchaseId,
      stripePaymentIntentId: payload.stripePaymentIntentId,
      hostedInvoiceUrl: payload.hostedInvoiceUrl ?? null,
      invoicePdfUrl: payload.invoicePdfUrl ?? null,
      receiptUrl: payload.receiptUrl ?? null,
      items: enriched.items,
      tickets: enriched.tickets,
    });
  }

  private shouldProcessRefundEmail(key: string): boolean {
    const now = Date.now();
    const ttlMs = 10 * 60 * 1000;
    const existing = this.processedRefundEmailKeys.get(key);

    if (existing && now - existing < ttlMs) {
      return false;
    }

    this.processedRefundEmailKeys.set(key, now);

    for (const [entryKey, entryTs] of this.processedRefundEmailKeys.entries()) {
      if (now - entryTs > ttlMs) {
        this.processedRefundEmailKeys.delete(entryKey);
      }
    }

    return true;
  }

  private resolveUsername(
    customerName?: string,
    buyerFirstname?: string,
    buyerLastname?: string,
    fallbackEmail?: string,
  ): string {
    const fullName = `${buyerFirstname ?? ''} ${buyerLastname ?? ''}`.trim();
    if (fullName) {
      return fullName;
    }
    if (customerName && customerName.trim().length > 0) {
      return customerName;
    }
    return fallbackEmail ?? 'Client';
  }

  private async fetchUserByEmail(
    email: string,
  ): Promise<{ firstName?: string | null; lastName?: string | null } | null> {
    try {
      const response = await fetch(
        `${this.userServiceBaseUrl}/api/users/email/${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        user?: { firstName?: string | null; lastName?: string | null };
      };

      if (!payload.user) {
        return null;
      }

      return {
        firstName: payload.user.firstName ?? undefined,
        lastName: payload.user.lastName ?? undefined,
      };
    } catch (error) {
      this.logger.warn(
        `Impossible de recuperer l'utilisateur par email: ${
          error instanceof Error ? error.message : 'erreur inconnue'
        }`,
      );
      return null;
    }
  }

  private async fetchPurchaseByStripePaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<{
    purchaseId: string;
    purchaseDate: string | undefined;
    eventId?: string;
    statusLabel: string;
    amountTotal: number;
    currency: string;
    ticketCount: number;
    buyerFirstname?: string;
    buyerLastname?: string;
    buyerEmail?: string | null;
    items: Array<{ name: string; quantity: number; unitAmount?: number }>;
    tickets: Array<{
      ticketNumber?: string;
      attendeeLastname?: string;
      attendeeFirstname?: string;
      attendeeEmail?: string | null;
      ticketTypeName?: string;
      statusLabel?: string;
      qrCode?: string;
    }>;
  } | null> {
    const maxAttempts = 5;
    const delayMs = 800;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const purchase = await this.tryFetchTicketingPurchase(
        stripePaymentIntentId,
      );
      if (purchase) {
        return purchase;
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return null;
  }

  private async tryFetchTicketingPurchase(
    stripePaymentIntentId: string,
  ): Promise<{
    purchaseId: string;
    purchaseDate: string | undefined;
    eventId?: string;
    statusLabel: string;
    amountTotal: number;
    currency: string;
    ticketCount: number;
    buyerFirstname?: string;
    buyerLastname?: string;
    buyerEmail?: string | null;
    items: Array<{ name: string; quantity: number; unitAmount?: number }>;
    tickets: Array<{
      ticketNumber?: string;
      attendeeLastname?: string;
      attendeeFirstname?: string;
      attendeeEmail?: string | null;
      ticketTypeName?: string;
      statusLabel?: string;
    }>;
  } | null> {
    try {
      const response = await fetch(
        `${this.ticketingBaseUrl}/api/ticketing/internal/purchases/payment-intent/${encodeURIComponent(
          stripePaymentIntentId,
        )}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        purchase?: {
          id?: string;
          eventId?: string;
          paidAt?: string | null;
          createdAt?: string | null;
          statusLabel?: string;
          totalAmount?: number;
          currency?: string;
          buyer?: {
            firstName?: string | null;
            lastName?: string | null;
            email?: string | null;
          } | null;
          items?: Array<{
            label?: string;
            quantity?: number;
            unitAmount?: number;
          }>;
          tickets?: Array<{
            ticketNumber?: string;
            attendeeLastname?: string;
            attendeeFirstname?: string;
            attendeeEmail?: string | null;
            ticketTypeName?: string | null;
            statusLabel?: string;
            qrCode?: string | null;
          }>;
        };
      };

      const purchase = payload.purchase;
      if (!purchase?.id) {
        return null;
      }

      const items = Array.isArray(purchase.items)
        ? purchase.items.map((item) => ({
            name: item.label ?? 'Ticket',
            quantity: Number(item.quantity ?? 0),
            unitAmount:
              typeof item.unitAmount === 'number' ? item.unitAmount : undefined,
          }))
        : [];

      const tickets = Array.isArray(purchase.tickets)
        ? purchase.tickets.map((ticket) => ({
            ticketNumber: ticket.ticketNumber,
            attendeeLastname: ticket.attendeeLastname,
            attendeeFirstname: ticket.attendeeFirstname,
            attendeeEmail: ticket.attendeeEmail ?? undefined,
            ticketTypeName: ticket.ticketTypeName ?? undefined,
            statusLabel: ticket.statusLabel,
            qrCode: ticket.qrCode ?? undefined,
          }))
        : [];

      return {
        purchaseId: purchase.id,
        purchaseDate: purchase.paidAt ?? purchase.createdAt ?? undefined,
        eventId: purchase.eventId ?? undefined,
        statusLabel: purchase.statusLabel ?? 'Paiement confirme',
        amountTotal: Number(purchase.totalAmount ?? 0),
        currency: purchase.currency ?? 'EUR',
        ticketCount: tickets.length,
        buyerFirstname: purchase.buyer?.firstName ?? undefined,
        buyerLastname: purchase.buyer?.lastName ?? undefined,
        buyerEmail: purchase.buyer?.email ?? undefined,
        items,
        tickets,
      };
    } catch (error) {
      this.logger.warn(
        `Impossible de recuperer les infos ticketing: ${
          error instanceof Error ? error.message : 'erreur inconnue'
        }`,
      );
      return null;
    }
  }

  private async handleAuthWelcome(payload: AuthWelcomePayload) {
    if (!payload.email) {
      this.logger.warn('auth.mail.welcome sans email');
      return;
    }

    const user = await this.fetchUserByEmail(payload.email);
    const username = this.resolveUsername(
      payload.username,
      user?.firstName ?? undefined,
      user?.lastName ?? undefined,
      payload.email,
    );

    await this.mailService.sendWelcome({
      email: payload.email,
      username,
      activationUrl: payload.activationUrl,
    });
  }

  private async handleAuthPasswordReset(payload: AuthPasswordResetPayload) {
    if (!payload.email || !payload.resetUrl) {
      this.logger.warn('auth.mail.password-reset incomplet');
      return;
    }

    const user = await this.fetchUserByEmail(payload.email);
    const username = this.resolveUsername(
      payload.username,
      user?.firstName ?? undefined,
      user?.lastName ?? undefined,
      payload.email,
    );

    await this.mailService.sendPasswordReset({
      email: payload.email,
      resetUrl: payload.resetUrl,
      username,
      expiresInMinutes: payload.expiresInMinutes,
    });
  }

  async onApplicationShutdown() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    await this.channel?.close();
    await this.connection?.close();
  }
}