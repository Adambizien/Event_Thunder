import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SubscriptionsModule],
})
export class AppModule {}
