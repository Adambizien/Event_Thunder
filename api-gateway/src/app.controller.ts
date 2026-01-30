import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from './auth/auth.guard';

type AuthenticatedRequest = Request & { user?: Record<string, unknown> };

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { message: 'La passerelle API fonctionne' };
  }

  @Get('api/protected')
  @UseGuards(AuthGuard)
  protectedRoute(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Vous avez accédé à une route protégée',
      user: req.user ?? null,
    };
  }
}
