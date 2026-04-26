import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  TicketCurrency,
  TicketPurchaseStatus,
  TicketType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { CreateTicketCheckoutDto } from './dto/create-ticket-checkout.dto';
import {
  UpsertEventTicketTypeItemDto,
  UpsertEventTicketTypesDto,
} from './dto/upsert-event-ticket-types.dto';

type BillingCheckoutItem = {
  ticketTypeId: string;
  name: string;
  description?: string;
  quantity: number;
  unitAmount: number;
  currency: string;
};

type BillingCheckoutResponse = {
  sessionId: string;
  url: string | null;
};

type BillingTicketSucceededPayload = {
  userId?: string;
  eventId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  customerEmail?: string;
  customerName?: string;
  attendeeFirstname?: string;
  attendeeLastname?: string;
  attendeeEmail?: string;
  attendees?: Array<{
    ticketTypeId?: string;
    firstname?: string;
    lastname?: string;
    email?: string;
  }>;
  amountTotal?: number;
  currency?: string;
  items?: Array<{
    ticketTypeId?: string;
    name?: string;
    description?: string;
    quantity?: number;
    unitAmount?: number;
    currency?: string;
  }>;
};

type BillingTicketRefundedPayload = {
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  amount?: number;
  currency?: string;
  reason?: string | null;
  refundedAt?: string;
};

type BillingRefundResponse = {
  refundId: string;
  status: string;
  amount: number;
  currency: string;
};

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async getEventTicketTypes(eventId: string, includeInactive = false) {
    return this.prisma.ticketType.findMany({
      where: {
        event_id: eventId,
        ...(includeInactive ? {} : { is_active: true }),
      },
      orderBy: [{ price: 'asc' }, { created_at: 'asc' }],
    });
  }

  async upsertEventTicketTypes(
    eventId: string,
    dto: UpsertEventTicketTypesDto,
  ) {
    const normalizedNames = new Set<string>();
    for (const item of dto.ticket_types) {
      const key = item.name.trim().toLowerCase();
      if (normalizedNames.has(key)) {
        throw new BadRequestException(
          `Nom de ticket dupliqué: ${item.name.trim()}`,
        );
      }
      normalizedNames.add(key);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ticketType.findMany({
        where: { event_id: eventId },
      });
      const existingById = new Map(
        existing.map((ticket) => [ticket.id, ticket]),
      );

      const keepIds: string[] = [];
      const updated: TicketType[] = [];

      for (const item of dto.ticket_types) {
        if (item.id && existingById.has(item.id)) {
          const next = await tx.ticketType.update({
            where: { id: item.id },
            data: this.toTicketTypeUpdateData(item),
          });
          keepIds.push(next.id);
          updated.push(next);
          continue;
        }

        const created = await tx.ticketType.create({
          data: {
            event_id: eventId,
            name: item.name.trim(),
            description: item.description?.trim() || null,
            price: this.toPrismaDecimal(item.price),
            currency: item.currency ?? TicketCurrency.EUR,
            max_quantity: item.max_quantity ?? null,
            is_active: item.is_active ?? true,
          },
        });
        keepIds.push(created.id);
        updated.push(created);
      }

      const removedIds = existing
        .map((ticket) => ticket.id)
        .filter((id) => !keepIds.includes(id));

      if (removedIds.length > 0) {
        const protectedTickets = await tx.ticketType.findMany({
          where: {
            event_id: eventId,
            id: { in: removedIds },
            OR: [
              { sold_quantity: { gt: 0 } },
              { items: { some: {} } },
              { tickets: { some: {} } },
            ],
          },
          select: {
            name: true,
          },
        });

        if (protectedTickets.length > 0) {
          const names = protectedTickets
            .map((ticket) => ticket.name)
            .join(', ');
          throw new BadRequestException(
            `Suppression impossible: des achats existent pour ${names}`,
          );
        }

        await tx.ticketType.deleteMany({
          where: {
            event_id: eventId,
            id: { in: removedIds },
          },
        });
      }

      return updated;
    });

    return {
      event_id: eventId,
      ticket_types: result,
    };
  }

  async createCheckoutSession(
    userId: string,
    dto: CreateTicketCheckoutDto,
    authorization: string,
  ): Promise<BillingCheckoutResponse> {
    const quantitiesByType = new Map<string, number>();
    for (const item of dto.items) {
      const current = quantitiesByType.get(item.ticket_type_id) ?? 0;
      quantitiesByType.set(item.ticket_type_id, current + item.quantity);
    }

    const ticketTypes = await this.prisma.ticketType.findMany({
      where: {
        event_id: dto.event_id,
        is_active: true,
        id: { in: [...quantitiesByType.keys()] },
      },
    });

    if (ticketTypes.length !== quantitiesByType.size) {
      throw new NotFoundException(
        'Un ou plusieurs types de ticket sont introuvables',
      );
    }

    const billingItems: BillingCheckoutItem[] = [];
    for (const ticketType of ticketTypes) {
      const quantity = quantitiesByType.get(ticketType.id) ?? 0;
      if (quantity <= 0) {
        throw new BadRequestException(
          'Quantité invalide pour un type de ticket',
        );
      }

      if (
        ticketType.max_quantity !== null &&
        ticketType.sold_quantity + quantity > ticketType.max_quantity
      ) {
        throw new BadRequestException(
          `Stock insuffisant pour le ticket "${ticketType.name}"`,
        );
      }

      const unitAmount = Number(ticketType.price);
      if (unitAmount <= 0) {
        throw new BadRequestException(
          `Prix invalide pour le ticket "${ticketType.name}"`,
        );
      }

      billingItems.push({
        ticketTypeId: ticketType.id,
        name: ticketType.name,
        description: ticketType.description ?? undefined,
        quantity,
        unitAmount,
        currency: ticketType.currency,
      });
    }

    const billingBaseUrl =
      this.configService.get<string>('BILLING_SERVICE_URL') ??
      'http://billing-service:3000';

    try {
      const attendees = Array.isArray(dto.attendees)
        ? dto.attendees.map((a) => ({
            ticketTypeId: a.ticket_type_id,
            firstname: a.firstname,
            lastname: a.lastname,
            email: a.email,
          }))
        : [];
      const { data } = await firstValueFrom(
        this.httpService.post<BillingCheckoutResponse>(
          `${billingBaseUrl}/api/billing/tickets/checkout-session`,
          {
            userId,
            eventId: dto.event_id,
            successUrl: dto.success_url,
            cancelUrl: dto.cancel_url,
            customerEmail: dto.customer_email,
            customerName: dto.customer_name,
            attendees,
            items: billingItems,
          },
          {
            headers: {
              Authorization: authorization,
            },
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error(
        'Impossible de créer la session Stripe pour les tickets',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Création de session de paiement impossible',
      );
    }
  }

  async getMyTickets(userId: string, authorization: string) {
    const purchases = await this.prisma.ticketPurchase.findMany({
      where: { user_id: userId },
      include: {
        items: {
          include: {
            ticket_type: true,
          },
        },
        tickets: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const buyerByUserId = await this.fetchBuyersByUserIds(
      [userId],
      authorization,
    );
    const buyer = buyerByUserId.get(userId) ?? null;

    const enrichedPurchases = purchases.map((purchase) => ({
      ...purchase,
      buyer,
    }));

    return {
      purchases: enrichedPurchases,
    };
  }

  async getAdminTickets(authorization: string) {
    const purchases = await this.prisma.ticketPurchase.findMany({
      include: {
        items: {
          include: {
            ticket_type: true,
          },
        },
        tickets: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const uniqueUserIds = [
      ...new Set(purchases.map((purchase) => purchase.user_id)),
    ];
    const buyerByUserId = await this.fetchBuyersByUserIds(
      uniqueUserIds,
      authorization,
    );

    const enrichedPurchases = purchases.map((purchase) => ({
      ...purchase,
      buyer: buyerByUserId.get(purchase.user_id) ?? null,
    }));

    return {
      purchases: enrichedPurchases,
    };
  }

  async getEventSoldTickets(
    eventId: string,
    userId: string,
    isAdmin: boolean,
    authorization: string,
  ) {
    const isCreator = await this.isEventCreator(eventId, userId, authorization);
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Accès administrateur ou créateur requis');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        ticket_type: {
          event_id: eventId,
        },
      },
      include: {
        ticket_type: {
          select: {
            id: true,
            name: true,
            price: true,
            currency: true,
          },
        },
        ticket_purchase: {
          select: {
            id: true,
            user_id: true,
            stripe_payment_intent_id: true,
            created_at: true,
            paid_at: true,
            refunded_at: true,
            updated_at: true,
            status: true,
            total_amount: true,
            currency: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const uniqueUserIds = [
      ...new Set(tickets.map((ticket) => ticket.ticket_purchase.user_id)),
    ];
    const buyerByUserId = await this.fetchBuyersByUserIds(
      uniqueUserIds,
      authorization,
    );

    const enrichedTickets = tickets.map((ticket) => {
      const buyer = buyerByUserId.get(ticket.ticket_purchase.user_id) ?? null;

      return {
        ...ticket,
        ticket_purchase: {
          ...ticket.ticket_purchase,
          buyer,
        },
      };
    });

    return {
      event_id: eventId,
      count: enrichedTickets.length,
      tickets: enrichedTickets,
    };
  }

  private toStatusLabel(status?: string | null) {
    if (!status) {
      return '-';
    }

    const labels: Record<string, string> = {
      pending: 'En attente',
      paid: 'Payé',
      failed: 'Échoué',
      cancelled: 'Annulé',
      refunded: 'Remboursé',
    };

    return labels[status.toLowerCase()] ?? status;
  }

  async getPurchaseByStripePaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<{
    purchase: {
      id: string;
      eventId: string | null;
      paidAt: string | null;
      createdAt: string | null;
      statusLabel: string;
      totalAmount: number;
      currency: string;
      buyer: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      } | null;
      items: Array<{
        label: string;
        quantity: number;
        unitAmount: number;
        currency: string;
      }>;
      tickets: Array<{
        ticketNumber: string;
        attendeeFirstname: string;
        attendeeLastname: string;
        attendeeEmail: string | null;
        statusLabel: string;
        qrCode: string;
      }>;
    } | null;
  }> {
    const purchase = await this.prisma.ticketPurchase.findUnique({
      where: { stripe_payment_intent_id: stripePaymentIntentId },
      include: {
        items: {
          include: {
            ticket_type: true,
          },
        },
        tickets: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!purchase) {
      return { purchase: null };
    }

    const buyerByUserId = await this.fetchBuyersByUserIds([purchase.user_id]);
    const buyer = buyerByUserId.get(purchase.user_id) ?? null;

    return {
      purchase: {
        id: purchase.id,
        eventId: purchase.items[0]?.ticket_type?.event_id ?? null,
        paidAt: purchase.paid_at ? purchase.paid_at.toISOString() : null,
        createdAt: purchase.created_at
          ? purchase.created_at.toISOString()
          : null,
        statusLabel: this.toStatusLabel(purchase.status),
        totalAmount: Number(purchase.total_amount ?? 0),
        currency: purchase.currency,
        buyer,
        items: purchase.items.map((item) => ({
          label: item.ticket_type_label || item.ticket_type?.name || 'Ticket',
          quantity: item.quantity,
          unitAmount: Number(item.unit_price ?? 0),
          currency: item.currency,
        })),
        tickets: purchase.tickets.map((ticket) => ({
          ticketNumber: ticket.ticket_number,
          attendeeFirstname: ticket.attendee_firstname,
          attendeeLastname: ticket.attendee_lastname,
          attendeeEmail: ticket.attendee_email,
          statusLabel: ticket.used ? 'Utilisé' : 'Valide',
          qrCode: ticket.qr_code,
        })),
      },
    };
  }

  private async fetchBuyersByUserIds(
    userIds: string[],
    authorization?: string,
  ): Promise<
    Map<
      string,
      {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      }
    >
  > {
    const buyers = new Map<
      string,
      {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      }
    >();

    if (userIds.length === 0) {
      return buyers;
    }

    const userBaseUrl =
      this.configService.get<string>('USER_SERVICE_URL') ??
      'http://user-service:3000';

    const headers: Record<string, string> = {};
    if (authorization && authorization.trim().length > 0) {
      headers.Authorization = authorization;
    }

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const { data } = await firstValueFrom(
            this.httpService.get<{
              user?: {
                id?: string;
                firstName?: string | null;
                lastName?: string | null;
                email?: string | null;
              };
            }>(`${userBaseUrl}/api/users/${encodeURIComponent(userId)}`, {
              headers,
            }),
          );

          const user = data?.user;
          if (!user || !user.id) {
            return;
          }

          buyers.set(userId, {
            id: user.id,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            email: user.email ?? null,
          });
        } catch (error) {
          this.logger.warn(
            `Impossible de recuperer le profil acheteur ${userId}: ${
              error instanceof Error ? error.message : 'erreur inconnue'
            }`,
          );
        }
      }),
    );

    return buyers;
  }

  async getTicketPaymentInvoiceLinks(
    stripePaymentIntentId: string,
    userId: string,
    isAdmin: boolean,
    authorization: string,
  ) {
    const purchase = await this.prisma.ticketPurchase.findFirst({
      where: isAdmin
        ? { stripe_payment_intent_id: stripePaymentIntentId }
        : {
            stripe_payment_intent_id: stripePaymentIntentId,
            user_id: userId,
          },
      select: {
        id: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Paiement ticket introuvable');
    }

    const billingBaseUrl =
      this.configService.get<string>('BILLING_SERVICE_URL') ??
      'http://billing-service:3000';

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{
          hostedInvoiceUrl: string | null;
          invoicePdfUrl: string | null;
          receiptUrl: string | null;
        }>(
          `${billingBaseUrl}/api/billing/tickets/payments/${encodeURIComponent(stripePaymentIntentId)}/invoice-links`,
          {
            headers: {
              Authorization: authorization,
            },
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error(
        'Impossible de recuperer la facture ticket Stripe',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Recuperation de facture impossible',
      );
    }
  }

  async requestPurchaseRefund(
    purchaseId: string,
    userId: string,
    isAdmin: boolean,
    authorization: string,
    reason?: string,
  ): Promise<BillingRefundResponse> {
    const purchase = await this.prisma.ticketPurchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: {
          include: {
            ticket_type: {
              select: {
                event_id: true,
              },
            },
          },
        },
        tickets: {
          select: {
            used: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Achat ticket introuvable');
    }

    if (purchase.status === TicketPurchaseStatus.refunded) {
      throw new BadRequestException('Ce paiement ticket est déjà remboursé');
    }

    if (purchase.status !== TicketPurchaseStatus.paid) {
      throw new BadRequestException(
        'Seuls les achats payés sont remboursables',
      );
    }

    const eventId = purchase.items[0]?.ticket_type?.event_id;
    const isOwner = purchase.user_id === userId;
    const isEventCreator = eventId
      ? await this.isEventCreator(eventId, userId, authorization)
      : false;

    if (!isAdmin && !isOwner && !isEventCreator) {
      throw new ForbiddenException('Remboursement non autorisé');
    }

    if (purchase.tickets.some((ticket) => ticket.used)) {
      throw new BadRequestException(
        'Remboursement impossible: au moins un ticket a déjà été utilisé',
      );
    }

    const billingBaseUrl =
      this.configService.get<string>('BILLING_SERVICE_URL') ??
      'http://billing-service:3000';

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<BillingRefundResponse>(
          `${billingBaseUrl}/api/billing/tickets/refund`,
          {
            stripePaymentIntentId: purchase.stripe_payment_intent_id,
            reason: reason?.trim() || undefined,
          },
          {
            headers: {
              Authorization: authorization,
            },
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error(
        'Impossible de rembourser le paiement ticket',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Remboursement impossible');
    }
  }

  async handleBillingEvent(
    routingKey: string,
    payload: Record<string, unknown>,
  ) {
    if (routingKey === 'billing.ticket.payment.succeeded') {
      const typedPayload = payload as BillingTicketSucceededPayload;
      await this.createPurchaseFromSucceededPayment(typedPayload);
      return;
    }

    if (routingKey === 'billing.ticket.payment.refunded') {
      const typedPayload = payload as BillingTicketRefundedPayload;
      await this.applyPurchaseRefund(typedPayload);
      return;
    }

    this.logger.debug(`Routing key ignorée: ${routingKey}`);
  }

  private async applyPurchaseRefund(payload: BillingTicketRefundedPayload) {
    if (!payload.stripePaymentIntentId) {
      this.logger.warn('Event billing.ticket.payment.refunded incomplet');
      return;
    }

    const purchase = await this.prisma.ticketPurchase.findUnique({
      where: { stripe_payment_intent_id: payload.stripePaymentIntentId },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      this.logger.warn(
        `Achat ticket introuvable pour refund ${payload.stripePaymentIntentId}`,
      );
      return;
    }

    if (purchase.status === TicketPurchaseStatus.refunded) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ticketPurchase.update({
        where: { id: purchase.id },
        data: {
          status: TicketPurchaseStatus.refunded,
          refunded_at: payload.refundedAt
            ? new Date(payload.refundedAt)
            : new Date(),
          failure_reason: payload.reason ?? null,
        },
      });

      for (const item of purchase.items) {
        const ticketType = await tx.ticketType.findUnique({
          where: { id: item.ticket_type_id },
          select: {
            sold_quantity: true,
          },
        });

        if (!ticketType) {
          continue;
        }

        await tx.ticketType.update({
          where: { id: item.ticket_type_id },
          data: {
            sold_quantity: Math.max(
              0,
              ticketType.sold_quantity - item.quantity,
            ),
          },
        });
      }

      await tx.ticket.updateMany({
        where: {
          ticket_purchase_id: purchase.id,
          used: false,
        },
        data: {
          used: true,
          used_at: new Date(),
        },
      });
    });
  }

  private async createPurchaseFromSucceededPayment(
    payload: BillingTicketSucceededPayload,
  ) {
    if (
      !payload.userId ||
      !payload.eventId ||
      !payload.stripePaymentIntentId ||
      !Array.isArray(payload.items) ||
      payload.items.length === 0
    ) {
      this.logger.warn('Event billing.ticket.payment.succeeded incomplet');
      return;
    }

    const existing = await this.prisma.ticketPurchase.findUnique({
      where: { stripe_payment_intent_id: payload.stripePaymentIntentId },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    const currency = this.toTicketCurrency(payload.currency);
    const amountTotal = Number(payload.amountTotal ?? 0);
    const fallbackName = (payload.customerName || '').trim();
    const fallbackNameParts = fallbackName.split(/\s+/).filter(Boolean);
    const attendees: Array<{
      ticketTypeId: string;
      firstname: string;
      lastname: string;
      email: string;
    }> = Array.isArray(payload.attendees)
      ? payload.attendees
          .filter((attendee) => attendee && typeof attendee === 'object')
          .map((attendee) => ({
            ticketTypeId: String(attendee.ticketTypeId ?? ''),
            firstname: String(attendee.firstname ?? ''),
            lastname: String(attendee.lastname ?? ''),
            email: String(attendee.email ?? ''),
          }))
          .filter(
            (attendee) =>
              attendee.ticketTypeId.length > 0 && attendee.email.length > 0,
          )
      : [];

    await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.ticketPurchase.create({
        data: {
          user_id: payload.userId!,
          stripe_payment_intent_id: payload.stripePaymentIntentId!,
          status: TicketPurchaseStatus.paid,
          total_amount: this.toPrismaDecimal(
            amountTotal >= 0 ? amountTotal : 0,
          ),
          currency,
          paid_at: new Date(),
        },
      });

      let attendeeIdx = 0;
      for (const rawItem of payload.items ?? []) {
        const ticketTypeId = rawItem.ticketTypeId;
        const quantity = Number(rawItem.quantity ?? 0);
        if (!ticketTypeId || quantity <= 0) {
          continue;
        }

        const ticketType = await tx.ticketType.findUnique({
          where: { id: ticketTypeId },
        });
        if (!ticketType || ticketType.event_id !== payload.eventId) {
          continue;
        }

        if (
          ticketType.max_quantity !== null &&
          ticketType.sold_quantity + quantity > ticketType.max_quantity
        ) {
          throw new BadRequestException(
            `Stock insuffisant pour le ticket ${ticketType.name}`,
          );
        }

        const unitAmount = Number(
          rawItem.unitAmount ?? Number(ticketType.price),
        );
        const itemCurrency = this.toTicketCurrency(
          rawItem.currency ?? ticketType.currency,
        );

        await tx.ticketPurchaseItem.create({
          data: {
            ticket_purchase_id: purchase.id,
            ticket_type_id: ticketType.id,
            quantity,
            unit_price: this.toPrismaDecimal(unitAmount),
            currency: itemCurrency,
            ticket_type_label: rawItem.name?.trim() || ticketType.name,
          },
        });

        await tx.ticketType.update({
          where: { id: ticketType.id },
          data: {
            sold_quantity: {
              increment: quantity,
            },
          },
        });

        const ticketRows: Prisma.TicketCreateManyInput[] = [];
        for (let i = 0; i < quantity; i += 1) {
          const ticketNumber = this.generateTicketNumber(payload.eventId);
          const attendee = attendees[attendeeIdx] || {
            ticketTypeId,
            firstname: fallbackNameParts[0] || 'A_Renseigner',
            lastname: fallbackNameParts.slice(1).join(' ') || 'A_Renseigner',
            email: payload.customerEmail || null,
          };
          ticketRows.push({
            ticket_purchase_id: purchase.id,
            ticket_type_id: ticketType.id,
            attendee_firstname: attendee.firstname,
            attendee_lastname: attendee.lastname,
            attendee_email: attendee.email,
            ticket_number: ticketNumber,
            qr_code: Buffer.from(
              JSON.stringify({
                ticketNumber,
                purchaseId: purchase.id,
                ticketTypeId: ticketType.id,
              }),
            ).toString('base64'),
            used: false,
          });
          attendeeIdx++;
        }

        if (ticketRows.length > 0) {
          await tx.ticket.createMany({
            data: ticketRows,
          });
        }
      }
    });
  }

  private toTicketTypeUpdateData(item: UpsertEventTicketTypeItemDto) {
    return {
      name: item.name.trim(),
      description: item.description?.trim() || null,
      price: this.toPrismaDecimal(item.price),
      currency: item.currency ?? TicketCurrency.EUR,
      max_quantity: item.max_quantity ?? null,
      is_active: item.is_active ?? true,
    };
  }

  private async isEventCreator(
    eventId: string,
    userId: string,
    authorization: string,
  ): Promise<boolean> {
    const eventBaseUrl =
      this.configService.get<string>('EVENT_SERVICE_URL') ??
      'http://event-service:3000';

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{ creator_id?: string }>(
          `${eventBaseUrl}/api/events/${encodeURIComponent(eventId)}`,
          {
            headers: {
              Authorization: authorization,
            },
          },
        ),
      );

      return data?.creator_id === userId;
    } catch (error) {
      this.logger.warn(
        `Impossible de vérifier le créateur de l'événement ${eventId}: ${
          error instanceof Error ? error.message : 'erreur inconnue'
        }`,
      );
      return false;
    }
  }

  private toPrismaDecimal(value: number) {
    return new Prisma.Decimal(value.toFixed(2));
  }

  private toTicketCurrency(value: string | undefined): TicketCurrency {
    if (String(value ?? '').toUpperCase() === TicketCurrency.USD) {
      return TicketCurrency.USD;
    }

    return TicketCurrency.EUR;
  }

  private generateTicketNumber(eventId: string): string {
    const eventSegment = eventId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const randomSegment = randomUUID()
      .replace(/-/g, '')
      .slice(0, 10)
      .toUpperCase();
    return `ET-${eventSegment}-${randomSegment}`;
  }
}
