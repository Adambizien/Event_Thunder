import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { RabbitmqPublisherService } from './rabbitmq-publisher.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  controllers: [BillingController],
  providers: [BillingService, RabbitmqPublisherService, AuthGuard, AdminGuard],
  exports: [BillingService],
})
export class BillingModule {}
