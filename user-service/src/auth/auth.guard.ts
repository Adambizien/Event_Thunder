import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

type UserPayload = {
  id?: string;
  email?: string;
  role?: string;
};

type AuthenticatedRequest = Request & { user?: UserPayload };

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  private getAuthUrl(): string {
    return (
      (process.env.AUTH_SERVICE_URL || 'http://auth-service:3003') +
      '/api/auth/verify'
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = req.get('authorization');

    if (!authHeader) {
      throw new ForbiddenException('En-tête Authorization manquant');
    }

    try {
      const response = await fetch(this.getAuthUrl(), {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        throw new ForbiddenException('Token invalide');
      }

      const data = (await response.json()) as { user?: UserPayload };
      if (!data.user) {
        throw new ForbiddenException('Token invalide');
      }

      req.user = data.user;
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('Vérification du token échouée: ' + message);
      throw new ForbiddenException('Token invalide ou expiré');
    }
  }
}
