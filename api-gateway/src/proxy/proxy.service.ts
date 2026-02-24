import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import type { Request } from 'express';
import type { ParsedQs } from 'qs';

export type ProxyResult = {
  status: number;
  headers: Record<string, string | number | string[] | boolean | undefined>;
  data: ArrayBuffer | Buffer | string | Record<string, unknown>;
};

type GatewayRequest = Request<
  Record<string, string>,
  unknown,
  unknown,
  ParsedQs
>;

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  private routeTarget(originalUrl: string) {
    if (originalUrl.startsWith('/api/auth')) {
      return process.env.AUTH_SERVICE_URL || 'http://auth-service:3003';
    }
    if (originalUrl.startsWith('/api/users')) {
      return process.env.USER_SERVICE_URL || 'http://user-service:3002';
    }
    if (originalUrl.startsWith('/api/billing')) {
      return process.env.BILLING_SERVICE_URL || 'http://billing-service:3006';
    }
    if (originalUrl.startsWith('/api/subscriptions')) {
      return (
        process.env.SUBSCRIPTION_SERVICE_URL ||
        'http://subscription-service:3005'
      );
    }
    return null;
  }

  async forward(req: GatewayRequest): Promise<ProxyResult> {
    const target = this.routeTarget(req.originalUrl);
    if (!target) {
      throw new Error('Aucun service cible pour ce chemin');
    }

    const url = `${target}${req.originalUrl}`;

    const reqWithRaw = req as GatewayRequest & { rawBody?: Buffer };
    const bodyData = reqWithRaw.rawBody || req.body;

    const config: AxiosRequestConfig<unknown> = {
      method: req.method,
      url,
      headers: { ...req.headers, host: undefined },
      params: req.query,
      data: bodyData,
      validateStatus: () => true,
      timeout: 10000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      responseType: 'arraybuffer',
    };

    this.logger.log(`[PASSERELLE] ${req.method} ${req.originalUrl} -> ${url}`);

    const response = await axios.request<
      ArrayBuffer | Buffer | string | Record<string, unknown>
    >(config);

    return {
      status: response.status,
      headers: response.headers as ProxyResult['headers'],
      data: response.data,
    };
  }
}
