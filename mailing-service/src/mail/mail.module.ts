import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';

@Module({
  imports: [ConfigModule],
  providers: [MailService, RabbitmqConsumerService],
})
export class MailModule {}