import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import type { Response, Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type UserPayload = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
};

type AuthenticatedRequest = ExpressRequest & { user?: UserPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google/url')
  getGoogleAuthUrl() {
    return this.authService.generateGoogleAuthUrl();
  }

  // Route GET pour le callback Google
  @Get('google/callback')
  async googleAuthCallback(
    @Query('code') code: string,
    @Query() query: Record<string, string | string[]>,
    @Res() res: Response,
  ) {
    try {
      const decodedCode = code ? decodeURIComponent(code) : null;
      if (!decodedCode) {
        return this.serveClosePage(
          res,
          'error',
          `no_code. Params: ${Object.keys(query).join(', ')}`,
        );
      }
      const result = await this.authService.googleAuth({ code: decodedCode });
      return this.serveClosePage(
        res,
        'success',
        null,
        result.token,
        result.user,
      );
    } catch (error: unknown) {
      console.error('Google OAuth error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      return this.serveClosePage(res, 'error', errorMessage);
    }
  }

  private serveClosePage(
    res: Response,
    status: string,
    errorMessage: string | null,
    token?: string,
    user?: UserPayload,
  ) {
    const frontendUrl =
      process.env.FRONTEND_URL || 'http://testa.bizienadam.fr';

    if (status === 'success' && token && user) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Successful</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }
                .success-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 18px;
                    margin-bottom: 30px;
                }
            </style>
            <script>
                // CORRECTION: Envoyer à testa.bizienadam.fr
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({
                        type: 'OAUTH_SUCCESS',
                        token: '${token}',
                        user: ${JSON.stringify(user)}
                    }, '${frontendUrl}');
                    
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    // CORRECTION: Rediriger vers testa.bizienadam.fr
                    window.location.href = '${frontendUrl}?auth=google&status=success&token=${token}&user=${encodeURIComponent(JSON.stringify(user))}';
                }
            </script>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✅</div>
                <h1>Authentication Successful!</h1>
                <p class="message">Welcome, ${user.firstName ?? ''} ${user.lastName ?? ''}!</p>
                <p>Closing window automatically...</p>
            </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    } else {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Failed</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }
                .error-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
            </style>
            <script>
                // CORRECTION: Envoyer à testa.bizienadam.fr
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({
                        type: 'OAUTH_ERROR',
                        error: '${errorMessage}'
                    }, '${frontendUrl}');
                    
                    setTimeout(() => {
                        window.close();
                    }, 2000);
                } else {
                    // CORRECTION: Rediriger vers testa.bizienadam.fr
                    window.location.href = '${frontendUrl}?auth=google&status=error&message=${encodeURIComponent(errorMessage || 'Unknown error')}';
                }
            </script>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">❌</div>
                <h1>Authentication Failed</h1>
                <p>${errorMessage || 'Please try again'}</p>
                <p>Closing window...</p>
            </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    }
  }

  // Route POST pour le callback Google
  @Post('google/callback')
  googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleAuth(googleAuthDto);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  verifyToken(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }
    return this.authService.verifyToken(userId);
  }

  @Get('health')
  health() {
    return this.authService.getHealth();
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
