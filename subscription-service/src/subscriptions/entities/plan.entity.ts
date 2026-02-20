import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

export enum PlanName {
  Free = 'Free',
  Pro = 'Pro',
  Premium = 'Premium',
}

export enum PlanInterval {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

@Entity({ name: 'plans' })
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PlanName })
  name: PlanName;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: PlanInterval })
  interval: PlanInterval;

  @Column({ type: 'varchar', unique: true })
  stripe_price_id: string;

  @Column({ type: 'int', default: 2 })
  max_events: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Subscription, (subscription) => subscription.plan)
  subscriptions: Subscription[];
}
