import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

export enum PlanInterval {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export enum PlanCurrency {
  EUR = 'EUR',
  USD = 'USD',
}

@Entity({ name: 'plans' })
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: PlanInterval })
  interval: PlanInterval;

  @Column({ type: 'enum', enum: PlanCurrency, default: PlanCurrency.EUR })
  currency: PlanCurrency;

  @Column({ type: 'varchar', unique: true })
  stripe_price_id: string;

  @Column({ type: 'int', default: 2 })
  max_events: number;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Subscription, (subscription) => subscription.plan)
  subscriptions: Subscription[];
}
