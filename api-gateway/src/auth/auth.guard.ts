import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import type { Request } from 'express';

type UserPayload = Record<string, unknown>;
type AuthenticatedRequest = Request & { user?: UserPayload };

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = req.get('authorization');

    if (!authHeader) {
      throw new ForbiddenException('En-tête Authorization manquant');
    }

    try {
      const authUrl =
        (process.env.AUTH_SERVICE_URL || 'http://auth-service:3003') +
        '/api/auth/verify';

      this.logger.log(`Vérification du token à ${authUrl}`);

      const response = await axios.get<{ user: UserPayload }>(authUrl, {
        headers: {
          Authorization: authHeader,
        },
        timeout: 5000,
      });

      if (response.status !== 200) {
        throw new ForbiddenException('Token invalide');
      }

      const user = response.data.user;
      req.user = user;

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn('Vérification du token échouée: ' + message);
      throw new ForbiddenException('Token invalide ou expiré');
    }
  }
}
