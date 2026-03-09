import { PlanCurrency, PlanInterval, PlanLimitPeriod } from '@prisma/client';

export class UpdatePlanDto {
  name?: string;
  price?: number;
  interval?: PlanInterval;
  currency?: PlanCurrency;
  maxEvents?: number;
  maxPosts?: number;
  maxEventsPeriod?: PlanLimitPeriod;
  maxPostsPeriod?: PlanLimitPeriod;
  displayOrder?: number;
  description?: string | null;
}