import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesModule } from './categories/categories.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [CategoriesModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}