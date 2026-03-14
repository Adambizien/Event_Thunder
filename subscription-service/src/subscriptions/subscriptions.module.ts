import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    RabbitmqConsumerService,
    PrismaService,
    AuthGuard,
    AdminGuard,
  ],
})
export class SubscriptionsModule {}