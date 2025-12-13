import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

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
    return null;
  }

  async forward(req: any): Promise<{ status: number; headers: Record<string, unknown>; data: any }> {
    const target = this.routeTarget(req.originalUrl);
    if (!target) {
      throw new Error('No target service for this path');
    }

    const url = `${target}${req.originalUrl}`;
    const config: AxiosRequestConfig = {
      method: req.method,
      url,
      headers: { ...req.headers, host: undefined },
      params: req.query,
      data: req.body,
      validateStatus: () => true,
      responseType: 'arraybuffer',
      timeout: 10000,
    };

    this.logger.log(`[GATEWAY] ${req.method} ${req.originalUrl} -> ${url}`);

    const response = await axios.request(config);

    const headers = response.headers as Record<string, unknown>;

    return {
      status: response.status,
      headers,
      data: response.data,
    };
  }
}
