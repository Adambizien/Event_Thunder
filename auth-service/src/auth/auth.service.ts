import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as crypto from 'crypto';

type UserPayload = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
};

type UserResponse = { user: UserPayload };

type AuthResponse = {
  message: string;
  token: string;
  user: UserPayload;
};

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private userServiceUrl: string;
  private mailingServiceUrl: string;
  private resetTokens: Map<string, { email: string; expiresAt: number }> =
    new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {
    this.userServiceUrl =
      process.env.USER_SERVICE_URL || 'http://user-service:3002';
    this.mailingServiceUrl =
      process.env.MAILING_SERVICE_URL || 'http://mailing:3003';

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials are not defined');
    }

    this.googleClient = new OAuth2Client(
      googleClientId,
      googleClientSecret,
      process.env.GOOGLE_REDIRECT_URI ||
        'http://localhost:8000/api/auth/google/callback',
    );
  }

  generateGoogleAuthUrl(): { authUrl: string } {
    const authUrl = this.googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    });

    return { authUrl };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto): Promise<AuthResponse> {
    try {
      const { code } = googleAuthDto;

      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      const { tokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(tokens);

      if (!tokens.id_token) {
        throw new BadRequestException('No ID token received from Google');
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new BadRequestException('Charge utile de jeton Google invalide');
      }

      const { email, name } = payload;

      if (!email || !name) {
        throw new BadRequestException(
          'E-mail ou nom manquant dans la charge Google',
        );
      }

      let user: UserPayload | undefined;
      let isNewUser = false;
      try {
        const response = await firstValueFrom(
          this.httpService.get<UserResponse>(
            `${this.userServiceUrl}/api/users/email/${email}`,
          ),
        );
        user = response.data.user;
      } catch (error: unknown) {
        const isNotFound =
          isAxiosError(error) && error.response?.status === 404;
        if (isNotFound) {
          const parts = name.trim().split(/\s+/);
          const firstName = parts.shift() || '';
          const lastName = parts.join(' ') || '';
          const password = Math.random().toString(36).slice(-16) + 'Aa1!';

          const createUserResponse = await firstValueFrom(
            this.httpService.post<UserResponse>(
              `${this.userServiceUrl}/api/users`,
              {
                firstName,
                lastName,
                email,
                password,
              },
            ),
          );
          user = createUserResponse.data.user;
          isNewUser = true;
        } else {
          throw error;
        }
      }

      if (!user?.id) {
        throw new BadRequestException('User creation failed');
      }

      if (isNewUser) {
        this.sendWelcomeEmail(user.email, user.firstName).catch((error) => {
          console.error('Failed to send welcome email:', error);
        });
      }

      const token = this.generateToken(user.id);

      return {
        message: 'Google authentication successful',
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      };
    } catch (error: unknown) {
      console.error('Google OAuth error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<UserResponse>(
          `${this.userServiceUrl}/api/users`,
          registerDto,
        ),
      );

      const user = response.data.user;

      if (!user?.id) {
        throw new BadRequestException("Création d'utilisateur échouée");
      }

      const token = this.generateToken(user.id);

      this.sendWelcomeEmail(user.email, user.firstName).catch((error) => {
        console.error('Failed to send welcome email:', error);
      });

      return {
        message: 'Utilisateur enregistré avec succès',
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      };
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        throw new BadRequestException(error.response.data);
      }
      throw new BadRequestException('Auth service error');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<UserResponse>(
          `${this.userServiceUrl}/api/users/verify`,
          loginDto,
        ),
      );

      const user = response.data.user;

      if (!user?.id) {
        throw new UnauthorizedException('Identifiants invalides');
      }

      const token = this.generateToken(user.id);

      return {
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      };
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 400) {
        throw new UnauthorizedException('Identifiants invalides');
      }
      throw new UnauthorizedException("Erreur du service d'authentification");
    }
  }

  async verifyToken(userId: string): Promise<{ user: UserPayload }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserResponse>(
          `${this.userServiceUrl}/api/users/${userId}`,
        ),
      );

      const user = response.data.user;

      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      return { user };
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }
      throw new UnauthorizedException('Jeton invalide');
    }
  }

  getHealth() {
    return { message: 'Auth service is running' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserResponse>(
          `${this.userServiceUrl}/api/users/email/${dto.email}`,
        ),
      );

      const user = response.data.user;
      if (!user) {
        return { message: 'If the email exists, a reset link has been sent' };
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

      this.resetTokens.set(resetToken, {
        email: dto.email,
        expiresAt,
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      await firstValueFrom(
        this.httpService.post(`${this.mailingServiceUrl}/mail/password-reset`, {
          email: dto.email,
          resetUrl,
          username: user.firstName || user.email.split('@')[0],
          expiresInMinutes: 60,
        }),
      );

      return { message: 'If the email exists, a reset link has been sent' };
    } catch (error: unknown) {
      console.error('Forgot password error:', error);
      return { message: 'If the email exists, a reset link has been sent' };
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenData = this.resetTokens.get(dto.token);

    if (!tokenData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (Date.now() > tokenData.expiresAt) {
      this.resetTokens.delete(dto.token);
      throw new BadRequestException('Reset token has expired');
    }

    try {
      await firstValueFrom(
        this.httpService.patch(`${this.userServiceUrl}/api/users/password`, {
          email: tokenData.email,
          newPassword: dto.newPassword,
        }),
      );

      this.resetTokens.delete(dto.token);

      return { message: 'Password reset successfully' };
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        throw new BadRequestException(error.response.data);
      }
      throw new BadRequestException('Failed to reset password');
    }
  }

  private async sendWelcomeEmail(
    email: string,
    username?: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.mailingServiceUrl}/mail/welcome`, {
          email,
          username: username || email.split('@')[0],
        }),
      );
    } catch (error: unknown) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  private generateToken(userId: string): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    return this.jwtService.sign({ id: userId });
  }
}
