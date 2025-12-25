import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { message: 'La passerelle API (Nest) fonctionne' };
  }

  // Route protégée exemple
  @Get('api/protected')
  @UseGuards(AuthGuard)
  protectedRoute(@Req() req: any) {
    return { message: 'Vous avez accédé à une route protégée', user: req.user };
  }
}
