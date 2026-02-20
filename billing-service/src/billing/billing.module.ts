import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { RabbitmqPublisherService } from './rabbitmq-publisher.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, RabbitmqPublisherService],
  exports: [BillingService],
})
export class BillingModule {}
