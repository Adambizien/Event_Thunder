import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';

type UserPayload = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  planId?: string;
};

type AuthenticatedRequest = Request & { user?: UserPayload };
/* eslint-disable */
describe('AuthController - Tests réels d\'intégration', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    generateGoogleAuthUrl: jest.fn(),
    googleAuth: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    verifyToken: jest.fn(),
    getHealth: jest.fn(),
    forgotPassword: jest.fn(),
    verifyResetToken: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtAuthGuard,
          useValue: mockJwtAuthGuard,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('getGoogleAuthUrl', () => {
    it('devrait retourner l\'URL de connexion Google du service', () => {
      const mockAuthUrl = {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
      };
      mockAuthService.generateGoogleAuthUrl.mockReturnValue(mockAuthUrl);

      const result = controller.getGoogleAuthUrl();

      expect(result).toEqual(mockAuthUrl);
      expect(mockAuthService.generateGoogleAuthUrl).toHaveBeenCalled();
    });
  });

  describe('googleAuthCallback (GET)', () => {
    it('devrait servir une page HTML de succès après authentification Google', async () => {
      const code = 'test-code';
      const query = { code };
      const mockResult = {
        message: 'Google authentication successful',
        token: 'jwt-token-user-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      mockAuthService.googleAuth.mockResolvedValue(mockResult);

      const mockResponse = {
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.googleAuthCallback(code, query, mockResponse);

      expect(mockAuthService.googleAuth).toHaveBeenCalledWith({
        code: decodeURIComponent(code),
      });
      
      const setHeaderMock = mockResponse.setHeader as unknown as jest.Mock;
      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'text/html');
      
      const sendMock = mockResponse.send as unknown as jest.Mock;
      const htmlSent = sendMock.mock.calls[0][0] as string;
      expect(htmlSent).toContain('Authentication Successful');
      expect(htmlSent).toContain('John');
      expect(htmlSent).toContain('jwt-token-user-123');
    });

    it('devrait gérer l\'absence de code et retourner une erreur HTML', async () => {
      const mockResponse = {
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.googleAuthCallback('', {}, mockResponse);

      const sendMock = mockResponse.send as unknown as jest.Mock;
      const htmlSent = sendMock.mock.calls[0][0] as string;
      expect(htmlSent).toContain('error');
      expect(htmlSent).toContain('no_code');
    });

    it('devrait gérer les erreurs d\'authentification Google', async () => {
      const code = 'invalid-code';
      const query = { code };

      mockAuthService.googleAuth.mockRejectedValue(
        new Error('Google auth failed'),
      );

      const mockResponse = {
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await controller.googleAuthCallback(code, query, mockResponse);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();

      const sendMock = mockResponse.send as jest.Mock;
      const htmlSent = sendMock.mock.calls[0][0] as string;
      expect(htmlSent).toMatch(/error|failed/);
    });
  });

  describe('googleAuth (POST)', () => {
    it('devrait appeler le service et retourner le résultat', () => {
      const googleAuthDto = { code: 'test-code' };
      const mockResult = {
        message: 'Google authentication successful',
        token: 'jwt-token-user-123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockAuthService.googleAuth.mockReturnValue(mockResult);

      const result = controller.googleAuth(googleAuthDto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.googleAuth).toHaveBeenCalledWith(googleAuthDto);
    });
  });

  describe('register', () => {
    it('devrait appeler authService.register et retourner l\'utilisateur + token', () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
      };

      const mockResult = {
        message: 'Utilisateur enregistré avec succès',
        token: 'jwt-token-user-123',
        user: {
          id: 'user-123',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      mockAuthService.register.mockReturnValue(mockResult);

      const result = controller.register(registerDto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('devrait appeler authService.login et retourner le token JWT', () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'Password123!',
      };

      const mockResult = {
        message: 'Connexion réussie',
        token: 'jwt-token-user-123',
        user: {
          id: 'user-123',
          email: 'john@example.com',
          firstName: 'John',
        },
      };

      mockAuthService.login.mockReturnValue(mockResult);

      const result = controller.login(loginDto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('verifyToken', () => {
    it('devrait extraire l\'ID de la requête authentifiée et le passer au service', () => {
      const mockRequest = {
        user: { id: 'user-123' },
      } as unknown as AuthenticatedRequest;

      const mockResult = {
        user: {
          id: 'user-123',
          email: 'john@example.com',
          firstName: 'John',
        },
      };

      mockAuthService.verifyToken.mockReturnValue(mockResult);

      const result = controller.verifyToken(mockRequest);

      // ✓ Passe l'ID utilisateur au service
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockResult);
    });

    it('devrait rejeter si l\'utilisateur n\'est pas authentifié', () => {
      const mockRequest = {
        user: undefined,
      } as unknown as AuthenticatedRequest;

      expect(() => controller.verifyToken(mockRequest)).toThrow(
        BadRequestException,
      );
    });

    it('devrait rejeter si l\'ID utilisateur est manquant', () => {
      const mockRequest = {
        user: { email: 'test@example.com' }, // ✗ pas d'ID
      } as unknown as AuthenticatedRequest;

      expect(() => controller.verifyToken(mockRequest)).toThrow(
        BadRequestException,
      );
      expect(() => controller.verifyToken(mockRequest)).toThrow(
        'Utilisateur non authentifié',
      );
    });
  });

  describe('health', () => {
    it('devrait retourner le statut de santé du service', () => {
      const mockHealth = { message: 'Auth service is running' };
      mockAuthService.getHealth.mockReturnValue(mockHealth);

      const result = controller.health();

      expect(result).toEqual(mockHealth);
      expect(mockAuthService.getHealth).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('devrait envoyer l\'email de réinitialisation via le service', () => {
      const dto = { email: 'john@example.com' };
      const mockResult = {
        message: "Si l'email existe, un lien de réinitialisation a été envoyé",
      };

      mockAuthService.forgotPassword.mockReturnValue(mockResult);

      const result = controller.forgotPassword(dto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('verifyResetToken', () => {
    it('devrait vérifier un token de réinitialisation valide', () => {
      const token = 'valid-token';
      const mockResult = { valid: true, message: 'Jeton valide' };

      mockAuthService.verifyResetToken.mockReturnValue(mockResult);

      const result = controller.verifyResetToken(token);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.verifyResetToken).toHaveBeenCalledWith(token);
    });

    it('devrait gérer un token passé en tant que tableau query param', () => {
      const tokens = ['token1', 'token2'];
      const mockResult = { valid: true, message: 'Jeton valide' };

      mockAuthService.verifyResetToken.mockReturnValue(mockResult);

      const result = controller.verifyResetToken(tokens);

      expect(mockAuthService.verifyResetToken).toHaveBeenCalledWith('token1');
      expect(result).toEqual(mockResult);
    });

    it('devrait gérer un token invalide', () => {
      const token = 'invalid-token';
      const mockResult = { valid: false, message: 'Jeton invalide ou expiré' };

      mockAuthService.verifyResetToken.mockReturnValue(mockResult);

      const result = controller.verifyResetToken(token);

      expect(result.valid).toBe(false);
      expect(mockAuthService.verifyResetToken).toHaveBeenCalledWith(token);
    });
  });

  describe('resetPassword', () => {
    it('devrait réinitialiser le mot de passe via le service', () => {
      const dto = {
        token: 'valid-token',
        newPassword: 'NewPassword123!',
      };
      const mockResult = {
        message: 'Mot de passe réinitialisé avec succès',
      };

      mockAuthService.resetPassword.mockReturnValue(mockResult);

      const result = controller.resetPassword(dto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('devrait extraire le token du header et l\'ajouter à la liste noire', () => {
      const mockRequest = {
        user: { id: 'user-123' },
        headers: { authorization: 'Bearer jwt-token-user-123' },
      } as unknown as AuthenticatedRequest;

      const mockResult = { message: 'Déconnexion réussie' };

      mockAuthService.logout.mockReturnValue(mockResult);

      const result = controller.logout(mockRequest);

      // ✓ Passe le token complet au service
      expect(mockAuthService.logout).toHaveBeenCalledWith('Bearer jwt-token-user-123');
      expect(result).toEqual(mockResult);
    });

    it('devrait gérer l\'absence de header authorization', () => {
      const mockRequest = {
        user: { id: 'user-123' },
        headers: {},
      } as unknown as AuthenticatedRequest;

      const mockResult = { message: 'Déconnexion réussie' };

      mockAuthService.logout.mockReturnValue(mockResult);

      const result = controller.logout(mockRequest);

      expect(mockAuthService.logout).toHaveBeenCalledWith('');
      expect(result).toEqual(mockResult);
    });
  });
});
