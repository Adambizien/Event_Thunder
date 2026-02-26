import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';
/* eslint-disable */
describe('AuthService - Tests réels de logique métier', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let httpService: HttpService;

  // Utilise une VRAIE implémentation de JwtService pour les tests critiques
  const JWT_SECRET = 'test-secret-key-for-jwt-validation';

  const mockJwtService = {
    sign: jest.fn().mockImplementation((payload) => {
      // ✓ Génère un VRAI JWT signé
      return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    }),
    verify: jest.fn().mockImplementation((token) => {
      // ✓ Vérifie un VRAI JWT
      try {
        return jwt.verify(token, JWT_SECRET);
      } catch {
        throw new Error('Invalid token');
      }
    }),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.USER_SERVICE_URL = 'http://user-service:3002';
    process.env.MAILING_SERVICE_URL = 'http://mailing:3004';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('devrait créer un utilisateur ET générer un token JWT VALIDE contenant l\'ID', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'user',
      };

      const mockResponse = {
        data: { user: mockUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      } as unknown as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.register(registerDto);

      // ✓ Vérifie les appels réels
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://user-service:3002/api/users',
        registerDto,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({ id: 'user-123' });
      
      // ✓ VRAI TEST: Vérifie que le token JWT est valide et contient l'ID
      const decoded = jwt.verify(result.token, JWT_SECRET) as { id: string };
      expect(decoded.id).toBe('user-123');
      expect(result.message).toBe('Utilisateur enregistré avec succès');
      expect(result.user.id).toBe('user-123');
    });

    it('devrait appeler le service de mailing pour envoyer un email de bienvenue', async () => {
      const registerDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 'user-456',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        role: 'user',
      };

      const userResponse = {
        data: { user: mockUser },
      } as unknown as AxiosResponse;

      const mailResponse = {
        data: { success: true },
      } as unknown as AxiosResponse;

      mockHttpService.post.mockImplementation((url) => {
        if (url.includes('/api/users') && !url.includes('verify')) {
          return of(userResponse);
        }
        if (url.includes('/mail/welcome')) {
          return of(mailResponse);
        }
        return of(mailResponse);
      });

      const result = await service.register(registerDto);

      // Attendre un peu pour que l'email soit envoyé (asynchrone)
      await new Promise(resolve => setTimeout(resolve, 10));

      // ✓ Vérifie que le mail a été appelé
      const mailCall = mockHttpService.post.mock.calls.find(call =>
        call[0].includes('/mail/welcome')
      );
      expect(mailCall).toBeDefined();
      expect(mailCall?.[1]).toEqual({
        email: 'jane@example.com',
        username: 'Jane',
      });
    });

    it('devrait rejeter l\'enregistrement si l\'email existe déjà', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
      };

      const axiosError = {
        response: {
          data: { message: 'Email déjà utilisé' },
          status: 400,
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devrait rejeter l\'enregistrement si user-service retourne pas d\'ID', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
      };

      const invalidResponse = {
        data: { user: { email: 'john@example.com' } }, // ✗ pas d'ID
      } as unknown as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(invalidResponse));

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Flot Complet: Register → Login → Verify → Logout', () => {
    it('devrait créer un utilisateur, le connecter, vérifier et déconnecter', async () => {
      const registerDto = {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        password: 'Secure123!',
      };

      const mockUser = {
        id: 'user-alice-001',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        role: 'user',
      };

      // ✓ STEP 1: Register
      const registerResponse = {
        data: { user: mockUser },
      } as unknown as AxiosResponse;

      mockHttpService.post.mockReturnValueOnce(of(registerResponse));
      const registerResult = await service.register(registerDto);

      expect(registerResult.user.id).toBe('user-alice-001');
      const registerToken = registerResult.token;

      // ✓ STEP 2: Login avec les mêmes credentials
      const loginDto = {
        email: 'alice@example.com',
        password: 'Secure123!',
      };

      const loginResponse = {
        data: { user: mockUser },
      } as unknown as AxiosResponse;

      mockHttpService.post.mockReturnValueOnce(of(loginResponse));
      const loginResult = await service.login(loginDto);

      expect(loginResult.user.id).toBe('user-alice-001');
      const loginToken = loginResult.token;

      // ✓ VRAI TEST: Les deux tokens sont des JWTs valides et contiennent le même ID
      const decodedRegister = jwt.verify(registerToken, JWT_SECRET) as { id: string };
      const decodedLogin = jwt.verify(loginToken, JWT_SECRET) as { id: string };
      expect(decodedRegister.id).toBe('user-alice-001');
      expect(decodedLogin.id).toBe('user-alice-001');

      // ✓ STEP 3: Verify le token
      mockHttpService.get.mockReturnValueOnce(of(registerResponse));
      const verifyResult = await service.verifyToken('user-alice-001');
      expect(verifyResult.user.id).toBe('user-alice-001');

      // ✓ STEP 4: Logout (ajoute à blacklist)
      mockJwtService.verify.mockReturnValueOnce({ id: 'user-alice-001' });
      const logoutResult = service.logout(`Bearer ${loginToken}`);
      expect(logoutResult.message).toBe('Déconnexion réussie');

      // ✓ VRAI TEST: Le token est maintenant blacklisté
      expect(service.isTokenBlacklisted(loginToken)).toBe(true);
    });
  });

  describe('login', () => {
    it('devrait connecter l\'utilisateur ET générer un token JWT valide contenant son ID', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-789',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'user',
      };

      const mockResponse = {
        data: { user: mockUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      } as unknown as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.login(loginDto);

      // ✓ Vérifie que le service d'authentification utilisateur a été appelé
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://user-service:3002/api/users/verify',
        loginDto,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({ id: 'user-789' });
      
      // ✓ VRAI TEST: Vérifie que le JWT est valide et contient l'ID
      const decoded = jwt.verify(result.token, JWT_SECRET) as { id: string };
      expect(decoded.id).toBe('user-789');
      expect(result.message).toBe('Connexion réussie');
      expect(result.user.id).toBe('user-789');
    });

    it('devrait rejeter la connexion avec des identifiants invalides', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      const axiosError = {
        response: {
          status: 400,
          data: { message: 'Invalid credentials' },
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Identifiants invalides',
      );
    });

    it('devrait rejeter la connexion si user-service n\'existe pas', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const axiosError = {
        response: {
          status: 404,
          data: { message: 'User not found' },
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait rejeter si l\'utilisateur retourné n\'a pas d\'ID', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'Password123!',
      };

      const invalidResponse = {
        data: { user: { email: 'john@example.com' } }, // ✗ pas d'ID
      } as unknown as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(invalidResponse));

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyToken', () => {
    it('devrait vérifier un token valide et retourner l\'utilisateur correspondant', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockResponse = {
        data: { user: mockUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      } as unknown as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.verifyToken(userId);

      // ✓ Vérifie que l'utilisateur correct est retourné
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('john@example.com');
      
      // ✓ Vérifie que le bon endpoint est appelé
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://user-service:3002/api/users/user-123',
      );
    });

    it('devrait rejeter si l\'utilisateur n\'existe pas', async () => {
      const userId = 'user-999';

      const axiosError = {
        response: {
          status: 404,
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      mockHttpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.verifyToken(userId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(userId)).rejects.toThrow(
        'Utilisateur non trouvé',
      );
    });

    it('devrait rejeter si l\'utilisateur est null', async () => {
      const userId = 'user-123';
      const invalidResponse = {
        data: { user: null },
      } as unknown as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(invalidResponse));

      await expect(service.verifyToken(userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Flot Complet: ForgotPassword → ResetPassword', () => {
    it('devrait générer token, l\'envoyer, puis utiliser pour réinitialiser le mot de passe', async () => {
      const email = 'bob@example.com';
      const mockUser = {
        id: 'user-bob',
        firstName: 'Bob',
        email,
      };

      // ✓ STEP 1: Utilisateur demande forgotPassword
      const userResponse = {
        data: { user: mockUser },
      } as unknown as AxiosResponse;

      const mailResponse = {
        data: { success: true },
      } as unknown as AxiosResponse;

      mockHttpService.get.mockReturnValueOnce(of(userResponse));
      mockHttpService.post.mockReturnValueOnce(of(mailResponse));

      const forgotResult = await service.forgotPassword({ email });
      expect(forgotResult.message).toContain('lien de réinitialisation');

      // ✓ Récupère le token généré depuis le mail
      const mailCall = mockHttpService.post.mock.calls[0];
      const resetUrl = mailCall[1].resetUrl as string;
      const token = resetUrl.split('token=')[1];

      // ✓ VRAI TEST: Le token peut être vérifié
      let verification = service.verifyResetToken(token);
      expect(verification.valid).toBe(true);

      // ✓ STEP 2: Utiliser le token pour réinitialiser
      const resetDto = {
        token,
        newPassword: 'NewPassword999!',
      };

      const patchResponse = {
        data: { success: true },
      } as unknown as AxiosResponse;

      mockHttpService.patch.mockReturnValueOnce(of(patchResponse));

      const resetResult = await service.resetPassword(resetDto);
      expect(resetResult.message).toBe('Mot de passe réinitialisé avec succès');

      // ✓ VRAI TEST: Le token ne fonctionne plus après utilisation (supprimé)
      verification = service.verifyResetToken(token);
      expect(verification.valid).toBe(false);
      expect(verification.message).toContain('invalide ou expiré');

      // ✓ VRAI TEST: Appel correct au service utilisateur
      expect(mockHttpService.patch).toHaveBeenCalledWith(
        'http://user-service:3002/api/users/password',
        {
          email,
          newPassword: 'NewPassword999!',
        },
      );
    });
  });

  describe('forgotPassword', () => {
    it('devrait générer un token de réinitialisation ET l\'envoyer par email', async () => {
      const dto = { email: 'john@example.com' };
      const mockUser = {
        id: '123',
        email: 'john@example.com',
        firstName: 'John',
      };

      const userResponse = {
        data: { user: mockUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      } as unknown as AxiosResponse;

      const mailResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      } as unknown as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(userResponse));
      mockHttpService.post.mockReturnValue(of(mailResponse));

      const result = await service.forgotPassword(dto);

      // ✓ Vérifie le message
      expect(result.message).toContain('lien de réinitialisation');
      
      // ✓ Vérifie que le service mailing a été appelé
      await new Promise(resolve => setTimeout(resolve, 10));
      const mailCall = mockHttpService.post.mock.calls.find(call =>
        call[0].includes('/mail/password-reset')
      );
      expect(mailCall).toBeDefined();
      expect(mailCall?.[1]).toMatchObject({
        email: 'john@example.com',
        username: 'John',
        expiresInMinutes: 30,
      });
      expect(mailCall?.[1].resetUrl).toContain('token=');
    });

    it('devrait rejeter un token invalide', async () => {
      const dto = {
        token: 'invalid-token',
        newPassword: 'NewPassword123!',
      };

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(dto)).rejects.toThrow(
        'invalide ou expiré',
      );
    });

    it('devrait rejeter un token expiré', async () => {
      const dto = {
        token: 'expired-token',
        newPassword: 'NewPassword123!',
      };

      const resetTokens = (service as unknown as Record<string, unknown>)
        .resetTokens as Map<string, { email: string; expiresAt: number }>;
      resetTokens.set('expired-token', {
        email: 'john@example.com',
        expiresAt: Date.now() - 10000, // ✗ Expiré
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(dto)).rejects.toThrow('expiré');
      
      // ✓ Token supprimé après détection d'expiration
      expect(resetTokens.has('expired-token')).toBe(false);
    });

    it('devrait rejeter si user-service échoue', async () => {
      const dto = {
        token: 'valid-token',
        newPassword: 'NewPassword123!',
      };

      const resetTokens = (service as unknown as Record<string, unknown>)
        .resetTokens as Map<string, { email: string; expiresAt: number }>;
      resetTokens.set('valid-token', {
        email: 'john@example.com',
        expiresAt: Date.now() + 10000,
      });

      const axiosError = {
        response: {
          status: 400,
          data: { message: 'Invalid password' },
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      mockHttpService.patch.mockReturnValue(throwError(() => axiosError));

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyResetToken', () => {
    it('devrait retourner valide pour un token de réinitialisation valide', () => {
      const token = 'valid-reset-token';
      const resetTokens = (service as unknown as Record<string, unknown>)
        .resetTokens as Map<string, { email: string; expiresAt: number }>;
      
      resetTokens.set(token, {
        email: 'john@example.com',
        expiresAt: Date.now() + 10000,
      });

      const result = service.verifyResetToken(token);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Jeton valide');
    });

    it('devrait retourner invalide pour un token manquant', () => {
      const result = service.verifyResetToken('');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Jeton manquant');
    });

    it('devrait retourner invalide pour un token inexistant', () => {
      const result = service.verifyResetToken('nonexistent-token');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Jeton invalide ou expiré');
    });

    it('devrait retourner invalide ET supprimer un token expiré', () => {
      const token = 'expired-reset-token';
      const resetTokens = (service as unknown as Record<string, unknown>)
        .resetTokens as Map<string, { email: string; expiresAt: number }>;
      
      resetTokens.set(token, {
        email: 'john@example.com',
        expiresAt: Date.now() - 10000, // ✗ Expiré
      });

      const result = service.verifyResetToken(token);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Le jeton a expiré');
      
      // ✓ Token supprimé de la map
      expect(resetTokens.has(token)).toBe(false);
    });
  });

  describe('logout', () => {
    it('devrait ajouter le token à la liste noire après vérification JWT', () => {
      // Génère un VRAI JWT
      const payload = { id: 'user-123' };
      const realToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const token = `Bearer ${realToken}`;

      // ✓ Mock verify pour retourner le payload du vrai JWT
      mockJwtService.verify.mockReturnValue(payload);

      const result = service.logout(token);

      expect(result.message).toBe('Déconnexion réussie');
      
      // ✓ Vérifie que le token sans Bearer est utilisé
      expect(mockJwtService.verify).toHaveBeenCalledWith(realToken);
      expect(service.isTokenBlacklisted(realToken)).toBe(true);
    });

    it('devrait supprimer le préfixe Bearer du token', () => {
      const payload = { id: 'user-456' };
      const realToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const token = `Bearer ${realToken}`;

      mockJwtService.verify.mockReturnValue(payload);

      service.logout(token);

      // ✓ Vérifie que le token sans Bearer est utilisé
      expect(mockJwtService.verify).toHaveBeenCalledWith(realToken);
      expect(service.isTokenBlacklisted(realToken)).toBe(true);
    });

    it('devrait gérer les tokens sans préfixe Bearer', () => {
      const payload = { id: 'user-789' };
      const realToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      mockJwtService.verify.mockReturnValue(payload);

      service.logout(realToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(realToken);
      expect(service.isTokenBlacklisted(realToken)).toBe(true);
    });

    it('devrait rejeter un token JWT invalide', () => {
      const token = 'Bearer invalid-token-xyz';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => service.logout(token)).toThrow(UnauthorizedException);
      expect(() => service.logout(token)).toThrow('Token invalide');
    });
  });

  describe('isTokenBlacklisted', () => {
    it('devrait retourner true pour un token qui a été blacklisté', () => {
      const token = 'blacklisted-token';
      
      // Simule un logout précédent
      const blacklistedTokens = (service as unknown as Record<string, unknown>)
        .blacklistedTokens as Set<string>;
      blacklistedTokens.add(token);

      const result = service.isTokenBlacklisted(token);

      expect(result).toBe(true);
    });

    it('devrait retourner false pour un token non blacklisté', () => {
      const result = service.isTokenBlacklisted('normal-token');

      expect(result).toBe(false);
    });

    it('devrait persistently blacklister les tokens après logout', () => {
      const payload = { id: 'user-test-persist' };
      const realToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const token = `Bearer ${realToken}`;
      
      mockJwtService.verify.mockReturnValue(payload);

      service.logout(token);

      // ✓ Le token reste blacklisté
      expect(service.isTokenBlacklisted(realToken)).toBe(true);
    });
  });

  describe('getHealth', () => {
    it('devrait retourner le statut de santé du service', () => {
      const result = service.getHealth();

      expect(result).toEqual({ message: 'Auth service is running' });
      expect(result.message).toBeTruthy();
    });
  });

  describe('generateGoogleAuthUrl', () => {
    it('devrait générer une URL d\'authentification Google valide', () => {
      const result = service.generateGoogleAuthUrl();

      expect(result).toHaveProperty('authUrl');
      expect(typeof result.authUrl).toBe('string');
      expect(result.authUrl).toContain('accounts.google.com');
      expect(result.authUrl).toContain('client_id=test-client-id');
      expect(result.authUrl).toContain('scope=');
      expect(result.authUrl).toContain('access_type=offline');
    });

    it('devrait contenir les bonnes scopes pour Google OAuth', () => {
      const result = service.generateGoogleAuthUrl();

      const url = result.authUrl;
      expect(url).toContain('userinfo.profile');
      expect(url).toContain('userinfo.email');
    });
  });
});
