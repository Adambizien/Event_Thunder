import { Controller, All, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService, ProxyResult } from './proxy.service';

@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All('api/*')
  async handle(@Req() req: Request, @Res() res: Response) {
    try {
      const result: ProxyResult = await this.proxy.forward(req);

      Object.entries(result.headers || {}).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value as string);
        }
      });

      res.status(result.status).send(result.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: 'Erreur de passerelle',
        error: message,
      });
    }
  }
}
