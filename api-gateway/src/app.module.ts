import { Module } from '@nestjs/common';
import { ProxyModule } from './proxy/proxy.module';
import { AppController } from './app.controller';

@Module({
  imports: [ProxyModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
