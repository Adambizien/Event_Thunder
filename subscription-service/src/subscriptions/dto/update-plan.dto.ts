import { PlanCurrency, PlanInterval } from '@prisma/client';

export class UpdatePlanDto {
  name?: string;
  price?: number;
  interval?: PlanInterval;
  currency?: PlanCurrency;
  maxEvents?: number;
  displayOrder?: number;
  description?: string | null;
}
