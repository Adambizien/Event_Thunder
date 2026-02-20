import { PlanInterval, PlanName } from '../entities/plan.entity';

export class CreatePlanDto {
  name: PlanName;
  price: number;
  interval: PlanInterval;
  stripePriceId?: string;
  maxEvents: number;
}

