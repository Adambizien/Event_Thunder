import { PlanCurrency, PlanInterval, PlanLimitPeriod } from '@prisma/client';

export class CreatePlanDto {
  name: string;
  price: number;
  interval: PlanInterval;
  currency?: PlanCurrency;
  stripePriceId?: string;
  maxEvents: number;
  maxPosts: number;
  maxEventsPeriod?: PlanLimitPeriod;
  maxPostsPeriod?: PlanLimitPeriod;
  displayOrder?: number;
  description?: string | null;
}