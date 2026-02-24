import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanCurrency, PlanInterval } from './entities/plan.entity';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    role?: string;
  };
};

@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  private ensureNonEmptyString(
    value: unknown,
    field: string,
  ): asserts value is string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`Champ invalide: ${field}`);
    }
  }

  private validatePlanPayload(dto: CreatePlanDto | UpdatePlanDto) {
    if ('name' in dto && dto.name !== undefined) {
      this.ensureNonEmptyString(dto.name, 'name');
    }

    if ('price' in dto && dto.price !== undefined) {
      if (typeof dto.price !== 'number' || Number.isNaN(dto.price) || dto.price <= 0) {
        throw new BadRequestException('Champ invalide: price');
      }
    }

    if ('interval' in dto && dto.interval !== undefined) {
      if (
        dto.interval !== PlanInterval.Monthly &&
        dto.interval !== PlanInterval.Yearly
      ) {
        throw new BadRequestException('Champ invalide: interval');
      }
    }

    if ('currency' in dto && dto.currency !== undefined) {
      if (dto.currency !== PlanCurrency.EUR && dto.currency !== PlanCurrency.USD) {
        throw new BadRequestException('Champ invalide: currency');
      }
    }

    if ('maxEvents' in dto && dto.maxEvents !== undefined) {
      if (
        typeof dto.maxEvents !== 'number' ||
        !Number.isInteger(dto.maxEvents) ||
        dto.maxEvents < -1
      ) {
        throw new BadRequestException('Champ invalide: maxEvents');
      }
    }

    if ('displayOrder' in dto && dto.displayOrder !== undefined) {
      if (
        typeof dto.displayOrder !== 'number' ||
        !Number.isInteger(dto.displayOrder)
      ) {
        throw new BadRequestException('Champ invalide: displayOrder');
      }
    }

    if ('description' in dto && dto.description !== undefined && dto.description !== null) {
      if (typeof dto.description !== 'string') {
        throw new BadRequestException('Champ invalide: description');
      }
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

  @Post('plans')
  @UseGuards(AuthGuard, AdminGuard)
  createPlan(
    @Body() dto: CreatePlanDto,
    @Headers('authorization') authHeader?: string,
  ) {
    this.validatePlanPayload(dto);
    return this.subscriptionsService.createPlan(dto, authHeader);
  }

  @Patch('plans/:id')
  @UseGuards(AuthGuard, AdminGuard)
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @Headers('authorization') authHeader?: string,
  ) {
    this.validatePlanPayload(dto);
    return this.subscriptionsService.updatePlan(id, dto, authHeader);
  }

  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Delete('plans/:id')
  @UseGuards(AuthGuard, AdminGuard)
  deletePlan(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.subscriptionsService.deletePlan(id, authHeader);
  }

  @Post('checkout-session')
  @UseGuards(AuthGuard)
  createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @Req() req: AuthenticatedRequest,
    @Headers('authorization') authHeader?: string,
  ) {
    this.ensureNonEmptyString(dto.userId, 'userId');
    this.ensureNonEmptyString(dto.planId, 'planId');
    this.ensureUrl(dto.successUrl, 'successUrl');
    this.ensureUrl(dto.cancelUrl, 'cancelUrl');

    const requestUserId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin';
    if (!isAdmin && requestUserId && requestUserId !== dto.userId) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.subscriptionsService.createCheckoutSession(dto, authHeader);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard)
  getUserSubscriptions(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const requestUserId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin';
    if (!isAdmin && requestUserId && requestUserId !== userId) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.subscriptionsService.getUserSubscriptions(userId);
  }
}
