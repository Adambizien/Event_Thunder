import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { ArchivePlanPriceDto } from './dto/archive-plan-price.dto';
import { SyncPlanPriceDto } from './dto/sync-plan-price.dto';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

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
  stripeWebhook(
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
    this.billingService.handleWebhookEvent(event);

    return { received: true };
  }
}
