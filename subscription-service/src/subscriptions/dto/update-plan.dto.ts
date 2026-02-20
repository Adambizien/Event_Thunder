import { PlanInterval, PlanName } from '../entities/plan.entity';

export class UpdatePlanDto {
  name?: PlanName;
  price?: number;
  interval?: PlanInterval;
  maxEvents?: number;
}
