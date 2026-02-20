import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { PaymentSubHistory } from './entities/payment-sub-history.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription, PaymentSubHistory]),
    HttpModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, RabbitmqConsumerService],
})
export class SubscriptionsModule {}
