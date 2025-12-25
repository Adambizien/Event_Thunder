import { Controller, All, Req, Res } from '@nestjs/common';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All('api/*')
  async handle(@Req() req: any, @Res() res: any) {
    try {
      const result = await this.proxy.forward(req);

      Object.keys(result.headers || {}).forEach((key) => {
        try {
          res.setHeader(key, result.headers[key]);
        } catch (e) {}
      });

      res.status(result.status).send(result.data);
    } catch (error: any) {
      res.status(500).json({ message: 'Erreur de passerelle', error: error?.message || error });
    }
  }
}
