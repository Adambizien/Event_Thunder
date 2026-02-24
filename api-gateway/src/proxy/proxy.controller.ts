import {
  Controller,
  All,
  Req,
  Res,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService, ProxyResult } from './proxy.service';
import { AuthGuard } from '../auth/auth.guard';

type UserPayload = {
  id?: string;
  email?: string;
  role?: string;
};

type AuthenticatedRequest = Request & {
  user?: UserPayload;
  body: Record<string, unknown>;
};

@Controller()
export class ProxyController {
  constructor(
    private readonly proxy: ProxyService,
    private readonly authGuard: AuthGuard,
  ) {}

  private getPath(req: Request): string {
    return req.path || req.originalUrl?.split('?')[0] || '';
  }

  private getMethod(req: Request): string {
    return (req.method || '').toUpperCase();
  }

  private isPublicRoute(req: Request): boolean {
    const path = this.getPath(req);
    const method = this.getMethod(req);

    if (!path.startsWith('/api/')) {
      return true;
    }

    if (path === '/api/billing/stripe/webhook' && method === 'POST') {
      return true;
    }

    if (path === '/api/subscriptions/plans' && method === 'GET') {
      return true;
    }

    return (
      path === '/api/auth/login' ||
      path === '/api/auth/register' ||
      path === '/api/auth/google/url' ||
      path === '/api/auth/google/callback' ||
      path === '/api/auth/forgot-password' ||
      path === '/api/auth/reset-password' ||
      path === '/api/auth/verify-reset-token' ||
      path === '/api/auth/health'
    );
  }

  private isAdminRoute(req: Request): boolean {
    const path = this.getPath(req);
    const method = this.getMethod(req);

    if (path === '/api/subscriptions/plans') {
      return method !== 'GET';
    }

    if (path.startsWith('/api/subscriptions/plans/')) {
      return method === 'PATCH' || method === 'DELETE';
    }

    if (path === '/api/users' && method === 'GET') {
      return true;
    }

    if (path === '/api/users/role' && method === 'PATCH') {
      return true;
    }

    if (/^\/api\/users\/[^/]+$/.test(path) && method === 'DELETE') {
      return true;
    }

    if (
      (path === '/api/billing/plans/sync-price' ||
        path === '/api/billing/plans/archive-price') &&
      method === 'POST'
    ) {
      return true;
    }

    return false;
  }

  private enforceOwnership(req: AuthenticatedRequest) {
    const path = this.getPath(req);
    const method = this.getMethod(req);
    const user = req.user;
    const isAdmin = user?.role === 'Admin';

    if (!user) {
      return;
    }

    if (path === '/api/users/password' && method === 'PUT') {
      if (!req.body || typeof req.body !== 'object') {
        req.body = {};
      }
      const payloadEmail = req.body?.email;
      if (typeof payloadEmail === 'string' && payloadEmail !== user.email) {
        throw new ForbiddenException('Modification de mot de passe refusée');
      }
      if (user.email) {
        req.body.email = user.email;
      }
    }

    if (path === '/api/users/profile' && method === 'PUT' && user.email) {
      if (!req.body || typeof req.body !== 'object') {
        req.body = {};
      }
      req.body.currentEmail = user.email;
    }

    if (!isAdmin && /^\/api\/users\/email\/[^/]+$/.test(path)) {
      throw new ForbiddenException('Accès refusé');
    }

    if (!isAdmin && /^\/api\/users\/[^/]+$/.test(path) && method === 'GET') {
      const userId = path.slice('/api/users/'.length);
      if (user.id !== userId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    if (
      !isAdmin &&
      /^\/api\/subscriptions\/user\/[^/]+$/.test(path) &&
      method === 'GET'
    ) {
      const userId = path.slice('/api/subscriptions/user/'.length);
      if (user.id !== userId) {
        throw new ForbiddenException('Accès refusé');
      }
    }
  }

  @All('api/*')
  async handle(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    try {
      if (!this.isPublicRoute(req)) {
        const user = await this.authGuard.authenticateRequest(req);
        req.user = user;

        if (this.isAdminRoute(req) && user.role !== 'Admin') {
          throw new ForbiddenException('Accès administrateur requis');
        }

        this.enforceOwnership(req);
      }

      const result: ProxyResult = await this.proxy.forward(req);

      Object.entries(result.headers || {}).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value as string);
        }
      });

      res.status(result.status).send(result.data);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        return res.status(error.getStatus()).json({
          message: error.message,
          error: error.name,
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erreur de passerelle',
        error: message,
      });
    }
  }
}
