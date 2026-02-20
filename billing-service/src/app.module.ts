import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), BillingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
