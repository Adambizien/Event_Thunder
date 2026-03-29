import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ProxyController } from './proxy.controller';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  controllers: [ProxyController],
  providers: [ProxyService, AuthGuard],
})
export class ProxyModule {}
