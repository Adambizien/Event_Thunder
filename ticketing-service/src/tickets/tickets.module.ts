import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [TicketsController],
  providers: [TicketsService, RabbitmqConsumerService, PrismaService],
})
export class TicketsModule {}