import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { UpsertEventTicketTypesDto } from './dto/upsert-event-ticket-types.dto';
import { CreateTicketCheckoutDto } from './dto/create-ticket-checkout.dto';

@Controller('api/ticketing')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  private ensureUuid(value: string, field: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new BadRequestException(`Champ invalide: ${field}`);
    }
  }

  @Get('events/:eventId/types')
  getEventTicketTypes(
    @Param('eventId') eventId: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    this.ensureUuid(eventId, 'eventId');
    return this.ticketsService.getEventTicketTypes(
      eventId,
      includeInactive === 'true',
    );
  }

  @Get('events/:eventId/sold-tickets')
  getEventSoldTickets(
    @Param('eventId') eventId: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('authorization') authorization?: string,
  ) {
    this.ensureUuid(eventId, 'eventId');
    if (userRole !== 'Admin') {
      throw new ForbiddenException('Accès administrateur requis');
    }

    if (!authorization || authorization.trim().length === 0) {
      throw new ForbiddenException('En-tête Authorization manquant');
    }

    return this.ticketsService.getEventSoldTickets(eventId, authorization);
  }

  @Put('events/:eventId/types')
  upsertEventTicketTypes(
    @Param('eventId') eventId: string,
    @Body() dto: UpsertEventTicketTypesDto,
    @Headers('x-user-role') userRole?: string,
  ) {
    this.ensureUuid(eventId, 'eventId');
    if (userRole !== 'Admin') {
      throw new ForbiddenException('Accès administrateur requis');
    }

    return this.ticketsService.upsertEventTicketTypes(eventId, dto);
  }

  @Post('checkout-session')
  createCheckoutSession(
    @Body() dto: CreateTicketCheckoutDto,
    @Headers('x-user-id') userId?: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    this.ensureUuid(userId, 'userId');

    if (!authorization || authorization.trim().length === 0) {
      throw new ForbiddenException('En-tête Authorization manquant');
    }

    return this.ticketsService.createCheckoutSession(
      userId,
      dto,
      authorization,
    );
  }

  @Get('me/tickets')
  getMyTickets(
    @Headers('x-user-id') userId?: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    this.ensureUuid(userId, 'userId');

    if (!authorization || authorization.trim().length === 0) {
      throw new ForbiddenException('En-tête Authorization manquant');
    }

    return this.ticketsService.getMyTickets(userId, authorization);
  }

  @Get('admin/tickets')
  getAdminTickets(
    @Headers('x-user-role') userRole?: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (userRole !== 'Admin') {
      throw new ForbiddenException('Accès administrateur requis');
    }

    if (!authorization || authorization.trim().length === 0) {
      throw new ForbiddenException('En-tête Authorization manquant');
    }

    return this.ticketsService.getAdminTickets(authorization);
  }

  @Get('payments/:stripePaymentIntentId/invoice-links')
  getTicketPaymentInvoiceLinks(
    @Param('stripePaymentIntentId') stripePaymentIntentId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    this.ensureUuid(userId, 'userId');

    if (!stripePaymentIntentId || stripePaymentIntentId.trim().length === 0) {
      throw new BadRequestException('Champ invalide: stripePaymentIntentId');
    }

    if (!authorization || authorization.trim().length === 0) {
      throw new ForbiddenException('En-tête Authorization manquant');
    }

    return this.ticketsService.getTicketPaymentInvoiceLinks(
      stripePaymentIntentId,
      userId,
      userRole === 'Admin',
      authorization,
    );
  }

  @Get('internal/purchases/payment-intent/:stripePaymentIntentId')
  getPurchaseByStripePaymentIntentId(
    @Param('stripePaymentIntentId') stripePaymentIntentId: string,
  ) {
    if (!stripePaymentIntentId || stripePaymentIntentId.trim().length === 0) {
      throw new BadRequestException('Champ invalide: stripePaymentIntentId');
    }

    return this.ticketsService.getPurchaseByStripePaymentIntentId(
      stripePaymentIntentId,
    );
  }
}