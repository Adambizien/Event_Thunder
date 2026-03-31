import {
  BadRequestException,
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
      const existingById = new Map(existing.map((ticket) => [ticket.id, ticket]));

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
          const names = protectedTickets.map((ticket) => ticket.name).join(', ');
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
      throw new NotFoundException('Un ou plusieurs types de ticket sont introuvables');
    }

    const billingItems: BillingCheckoutItem[] = [];
    for (const ticketType of ticketTypes) {
      const quantity = quantitiesByType.get(ticketType.id) ?? 0;
      if (quantity <= 0) {
        throw new BadRequestException('Quantité invalide pour un type de ticket');
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
        ? dto.attendees.map(a => ({
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

  async getMyTickets(userId: string) {
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

    return {
      purchases,
    };
  }

  async getEventSoldTickets(eventId: string) {
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
            currency: true,
          },
        },
        ticket_purchase: {
          select: {
            id: true,
            user_id: true,
            created_at: true,
            status: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      event_id: eventId,
      count: tickets.length,
      tickets,
    };
  }

  async handleBillingEvent(routingKey: string, payload: Record<string, unknown>) {
    if (routingKey !== 'billing.ticket.payment.succeeded') {
      this.logger.debug(`Routing key ignorée: ${routingKey}`);
      return;
    }

    const typedPayload = payload as BillingTicketSucceededPayload;
    await this.createPurchaseFromSucceededPayment(typedPayload);
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
    const attendees: Array<{ ticketTypeId: string; firstname: string; lastname: string; email: string }> = Array.isArray((payload as any).attendees)
      ? (payload as any).attendees
      : [];

    await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.ticketPurchase.create({
        data: {
          user_id: payload.userId!,
          stripe_payment_intent_id: payload.stripePaymentIntentId!,
          status: TicketPurchaseStatus.paid,
          total_amount: this.toPrismaDecimal(amountTotal >= 0 ? amountTotal : 0),
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

        const unitAmount = Number(rawItem.unitAmount ?? Number(ticketType.price));
        const itemCurrency = this.toTicketCurrency(rawItem.currency ?? ticketType.currency);

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
          const ticketNumber = this.generateTicketNumber(payload.eventId!);
          let attendee = attendees[attendeeIdx] || {
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

  private toPrismaDecimal(value: number) {
    return new Prisma.Decimal(value.toFixed(2));
  }

  private toTicketCurrency(value: string | TicketCurrency | undefined): TicketCurrency {
    if (String(value ?? '').toUpperCase() === TicketCurrency.USD) {
      return TicketCurrency.USD;
    }

    return TicketCurrency.EUR;
  }

  private generateTicketNumber(eventId: string): string {
    const eventSegment = eventId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const randomSegment = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
    return `ET-${eventSegment}-${randomSegment}`;
  }
}