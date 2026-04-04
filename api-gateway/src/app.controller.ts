import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { message: 'La passerelle API fonctionne' };
  }
}
