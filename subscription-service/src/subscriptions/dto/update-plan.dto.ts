import { PlanCurrency, PlanInterval } from '../entities/plan.entity';

export class UpdatePlanDto {
  name?: string;
  price?: number;
  interval?: PlanInterval;
  currency?: PlanCurrency;
  maxEvents?: number;
  displayOrder?: number;
  description?: string | null;
}
