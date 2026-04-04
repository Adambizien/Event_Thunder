import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CreateTicketCheckoutDto } from './dto/create-ticket-checkout.dto';
import { ArchivePlanPriceDto } from './dto/archive-plan-price.dto';
import { SyncPlanPriceDto } from './dto/sync-plan-price.dto';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

type AuthenticatedRequest = {
  rawBody?: Buffer;
  user?: {
    id?: string;
    role?: string;
  };
};

@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  private ensureNonEmptyString(
    value: unknown,
    field: string,
  ): asserts value is string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`Champ invalide: ${field}`);
    }
  }

  private ensureUrl(value: unknown, field: string) {
    this.ensureNonEmptyString(value, field);
    try {
      new URL(value);
    } catch {
      throw new BadRequestException(`URL invalide: ${field}`);
    }
  }

  @Post('subscriptions/checkout-session')
  @UseGuards(AuthGuard)
  async createSubscriptionCheckoutSession(
    @Body() dto: CreateSubscriptionCheckoutDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensureNonEmptyString(dto.userId, 'userId');
    this.ensureNonEmptyString(dto.planId, 'planId');
    this.ensureNonEmptyString(dto.stripePriceId, 'stripePriceId');
    this.ensureUrl(dto.successUrl, 'successUrl');
    this.ensureUrl(dto.cancelUrl, 'cancelUrl');

    if (
      dto.customerEmail !== undefined &&
      (typeof dto.customerEmail !== 'string' ||
        !dto.customerEmail.includes('@'))
    ) {
      throw new BadRequestException('Champ invalide: customerEmail');
    }

    const requestUserId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin';
    if (!isAdmin && requestUserId && requestUserId !== dto.userId) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.billingService.createSubscriptionCheckoutSession(dto);
  }

  @Post('tickets/checkout-session')
  @UseGuards(AuthGuard)
  async createTicketCheckoutSession(
    @Body() dto: CreateTicketCheckoutDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensureNonEmptyString(dto.userId, 'userId');
    this.ensureNonEmptyString(dto.eventId, 'eventId');
    this.ensureUrl(dto.successUrl, 'successUrl');
    this.ensureUrl(dto.cancelUrl, 'cancelUrl');
    this.ensureNonEmptyString(dto.customerEmail, 'customerEmail');
    this.ensureNonEmptyString(dto.customerName, 'customerName');

    if (!Array.isArray(dto.attendees) || dto.attendees.length === 0) {
      throw new BadRequestException('Champ invalide: attendees');
    }
    for (const [idx, attendee] of dto.attendees.entries()) {
      if (!attendee || typeof attendee !== 'object') {
        throw new BadRequestException(`Champ invalide: attendees[${idx}]`);
      }
      if (
        !attendee.firstname ||
        typeof attendee.firstname !== 'string' ||
        !attendee.firstname.trim()
      ) {
        throw new BadRequestException(
          `Champ invalide: attendees[${idx}].firstname`,
        );
      }
      if (
        !attendee.lastname ||
        typeof attendee.lastname !== 'string' ||
        !attendee.lastname.trim()
      ) {
        throw new BadRequestException(
          `Champ invalide: attendees[${idx}].lastname`,
        );
      }
      if (
        !attendee.email ||
        typeof attendee.email !== 'string' ||
        !attendee.email.includes('@')
      ) {
        throw new BadRequestException(
          `Champ invalide: attendees[${idx}].email`,
        );
      }
      if (!attendee.ticketTypeId || typeof attendee.ticketTypeId !== 'string') {
        throw new BadRequestException(
          `Champ invalide: attendees[${idx}].ticketTypeId`,
        );
      }
    }

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Champ invalide: items');
    }

    for (const item of dto.items) {
      this.ensureNonEmptyString(item.ticketTypeId, 'items.ticketTypeId');
      this.ensureNonEmptyString(item.name, 'items.name');
      this.ensureNonEmptyString(item.currency, 'items.currency');

      if (
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new BadRequestException('Champ invalide: items.quantity');
      }

      if (
        typeof item.unitAmount !== 'number' ||
        Number.isNaN(item.unitAmount) ||
        item.unitAmount <= 0
      ) {
        throw new BadRequestException('Champ invalide: items.unitAmount');
      }
    }

    const requestUserId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin';
    if (!isAdmin && requestUserId && requestUserId !== dto.userId) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.billingService.createTicketCheckoutSession(dto);
  }

  @Post('subscriptions/cancel')
  @UseGuards(AuthGuard)
  async cancelSubscription(
    @Body() dto: CancelSubscriptionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensureNonEmptyString(dto.userId, 'userId');
    this.ensureNonEmptyString(dto.stripeSubscriptionId, 'stripeSubscriptionId');

    const requestUserId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin';
    if (!isAdmin && requestUserId && requestUserId !== dto.userId) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.billingService.cancelSubscription(dto.stripeSubscriptionId);
  }

  @Get('invoices/:stripeInvoiceId')
  @UseGuards(AuthGuard)
  async getInvoiceLinks(@Param('stripeInvoiceId') stripeInvoiceId: string) {
    this.ensureNonEmptyString(stripeInvoiceId, 'stripeInvoiceId');
    return this.billingService.getInvoiceLinks(stripeInvoiceId);
  }

  @Get('tickets/payments/:stripePaymentIntentId/invoice-links')
  @UseGuards(AuthGuard)
  async getTicketPaymentLinks(
    @Param('stripePaymentIntentId') stripePaymentIntentId: string,
  ) {
    this.ensureNonEmptyString(stripePaymentIntentId, 'stripePaymentIntentId');
    return this.billingService.getTicketPaymentLinks(stripePaymentIntentId);
  }

  @Post('plans/sync-price')
  @UseGuards(AuthGuard, AdminGuard)
  async syncPlanPrice(@Body() dto: SyncPlanPriceDto) {
    this.ensureNonEmptyString(dto.name, 'name');
    if (
      typeof dto.price !== 'number' ||
      Number.isNaN(dto.price) ||
      dto.price <= 0
    ) {
      throw new BadRequestException('Champ invalide: price');
    }
    if (dto.interval !== 'monthly' && dto.interval !== 'yearly') {
      throw new BadRequestException('Champ invalide: interval');
    }
    if (
      dto.currency !== undefined &&
      dto.currency !== 'eur' &&
      dto.currency !== 'usd'
    ) {
      throw new BadRequestException('Champ invalide: currency');
    }

    return this.billingService.syncPlanPrice(dto);
  }

  @Post('plans/archive-price')
  @UseGuards(AuthGuard, AdminGuard)
  async archivePlanPrice(@Body() dto: ArchivePlanPriceDto) {
    return this.billingService.archivePlanPrice(dto.stripePriceId);
  }

  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Req() req: AuthenticatedRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Header stripe-signature manquant');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Raw body indisponible pour le webhook');
    }

    const event = this.billingService.constructWebhookEvent(
      req.rawBody,
      signature,
    );
    await this.billingService.handleWebhookEvent(event);

    return { received: true };
  }
}
