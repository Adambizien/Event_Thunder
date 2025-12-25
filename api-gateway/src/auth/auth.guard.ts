import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization || req.headers?.Authorization;

    if (!authHeader) {
      throw new ForbiddenException('En-tête Authorization manquant');
    }

    try {
      const authUrl = (process.env.AUTH_SERVICE_URL || 'http://auth-service:3003') + '/api/auth/verify';

      this.logger.log(`Vérification du token à ${authUrl}`);

      const response = await axios.get(authUrl, {
        headers: {
          Authorization: authHeader,
        },
        timeout: 5000,
      });

      if (response.status !== 200) {
        throw new ForbiddenException('Token invalide');
      }

      // Attacher l'utilisateur à la requête pour les gestionnaires en aval
      req.user = response.data.user || response.data;

      return true;
    } catch (err: any) {
      this.logger.warn('Vérification du token échouée: ' + (err?.message || err));
      throw new ForbiddenException('Token invalide ou expiré');
    }
  }
}
