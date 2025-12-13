import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { OAuth2Client } from 'google-auth-library';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private userServiceUrl: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
    
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials are not defined');
    }

    this.googleClient = new OAuth2Client(
      googleClientId,
      googleClientSecret,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback',
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

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    try {
      const { code } = googleAuthDto;

      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      // Échanger le code contre un token d'accès
      const { tokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(tokens);

      if (!tokens.id_token) {
        throw new BadRequestException('No ID token received from Google');
      }

      // Récupérer les infos utilisateur Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new BadRequestException('Invalid Google token payload');
      }

      const { sub: googleId, email, name, picture } = payload;

      if (!email || !name) {
        throw new BadRequestException('Missing email or name in Google payload');
      }

      console.log('Google user:', { googleId, email, name });

      // Vérifier si l'utilisateur existe déjà via le user-service
      let user;
      try {
        // Chercher par email
        const response = await firstValueFrom(
          this.httpService.get(`${this.userServiceUrl}/api/users/email/${email}`)
        );
        user = response.data.user;
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Créer un nouvel utilisateur via le user-service
          const username = name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
          const password = Math.random().toString(36).slice(-16) + 'Aa1!';

          const createUserResponse = await firstValueFrom(
            this.httpService.post(`${this.userServiceUrl}/api/users`, {
              username,
              email,
              password,
            })
          );
          user = createUserResponse.data.user;
        } else {
          throw error;
        }
      }

      if (!user?.id) {
        throw new BadRequestException('User creation failed');
      }

      // Générer le token JWT
      const token = this.generateToken(user.id);

      return {
        message: 'Google authentication successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: name || '',
          picture: picture || '',
        },
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async register(registerDto: RegisterDto) {
    try {
      // Appel direct au user-service Express
      const response = await firstValueFrom(
        this.httpService.post(`${this.userServiceUrl}/api/users`, registerDto)
      );
      
      const user = response.data.user;
      
      if (!user?.id) {
        throw new BadRequestException('User creation failed');
      }

      const token = this.generateToken(user.id);

      return {
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error: any) {
      // Propagation de l'erreur du user-service
      if (error.response) {
        throw new BadRequestException(error.response.data);
      }
      throw new BadRequestException('Auth service error');
    }
  }

  async login(loginDto: LoginDto) {
    try {
      // Appel direct au user-service Express pour vérifier les credentials
      const response = await firstValueFrom(
        this.httpService.post(`${this.userServiceUrl}/api/users/verify`, loginDto)
      );
      
      const user = response.data.user;
      
      if (!user?.id) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const token = this.generateToken(user.id);

      return {
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new UnauthorizedException('Auth service error');
    }
  }

  async verifyToken(userId: string) {
    try {
      // Récupérer l'utilisateur via le user-service
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/api/users/${userId}`)
      );
      
      const user = response.data.user;
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return { user };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new UnauthorizedException('User not found');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  getHealth() {
    return { message: 'Auth service is running' };
  }

  private generateToken(userId: string): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    return this.jwtService.sign({ id: userId });
  }
}