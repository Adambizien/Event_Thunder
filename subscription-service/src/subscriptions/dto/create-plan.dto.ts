import { PlanCurrency, PlanInterval } from '@prisma/client';

export class CreatePlanDto {
  name: string;
  price: number;
  interval: PlanInterval;
  currency?: PlanCurrency;
  stripePriceId?: string;
  maxEvents: number;
  displayOrder?: number;
  description?: string | null;
}
