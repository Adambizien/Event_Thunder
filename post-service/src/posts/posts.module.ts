import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  controllers: [PostsController],
  providers: [PostsService, PrismaService, RabbitmqPublisherService],
})
export class PostsModule {}
