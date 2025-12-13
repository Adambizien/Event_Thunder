import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { message: 'API Gateway (Nest) is running' };
  }

  // Example protected route
  @Get('api/protected')
  @UseGuards(AuthGuard)
  protectedRoute(@Req() req: any) {
    return { message: 'You accessed a protected route', user: req.user };
  }
}
