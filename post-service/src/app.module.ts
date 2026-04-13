import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PostsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
