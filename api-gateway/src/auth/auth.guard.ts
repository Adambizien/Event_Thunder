import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization || req.headers?.Authorization;

    if (!authHeader) {
      throw new ForbiddenException('Missing Authorization header');
    }

    try {
      const authUrl = (process.env.AUTH_SERVICE_URL || 'http://auth-service:3003') + '/api/auth/verify';

      this.logger.log(`Verifying token at ${authUrl}`);

      const response = await axios.get(authUrl, {
        headers: {
          Authorization: authHeader,
        },
        timeout: 5000,
      });

      if (response.status !== 200) {
        throw new ForbiddenException('Invalid token');
      }

      // Attach user to request for downstream handlers
      req.user = response.data.user || response.data;

      return true;
    } catch (err: any) {
      this.logger.warn('Token verification failed: ' + (err?.message || err));
      throw new ForbiddenException('Invalid or expired token');
    }
  }
}
