import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { SyncPlanPriceDto } from './dto/sync-plan-price.dto';

@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('subscriptions/checkout-session')
  async createSubscriptionCheckoutSession(
    @Body() dto: CreateSubscriptionCheckoutDto,
  ) {
    return this.billingService.createSubscriptionCheckoutSession(dto);
  }

  @Post('plans/sync-price')
  async syncPlanPrice(@Body() dto: SyncPlanPriceDto) {
    return this.billingService.syncPlanPrice(dto);
  }

  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  stripeWebhook(
    @Req() req: { rawBody?: Buffer },
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
