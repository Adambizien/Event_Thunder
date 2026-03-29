import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), BillingModule],
})
export class AppModule {}
