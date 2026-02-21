import { PlanCurrency, PlanInterval } from '../entities/plan.entity';

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
