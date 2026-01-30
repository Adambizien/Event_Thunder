import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import axios from 'axios';
/* eslint-disable */
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthGuard],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    authHeader?: string,
  ): ExecutionContext => {
    const mockRequest = {
      get: jest.fn((headerName: string) => {
        if (headerName === 'authorization') {
          return authHeader;
        }
        return undefined;
      }),
      user: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('devrait lancer une exception si le header Authorization est manquant', async () => {
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'En-tête Authorization manquant',
      );
    });

    it("devrait autoriser l'accès avec un token valide", async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      const context = createMockExecutionContext('Bearer valid-token');

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { user: mockUser },
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/verify'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer valid-token',
          },
          timeout: 5000,
        }),
      );
    });

    it("devrait ajouter l'utilisateur à la requête après validation", async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: 'admin' };
      const authHeader = 'Bearer valid-token';

      const mockRequest = {
        get: jest.fn(() => authHeader),
        user: undefined,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { user: mockUser },
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await guard.canActivate(context);

      expect(mockRequest.user).toEqual(mockUser);
    });

    it("devrait utiliser l'URL du service d'authentification par défaut", async () => {
      const context = createMockExecutionContext('Bearer token');
      const originalEnv = process.env.AUTH_SERVICE_URL;
      delete process.env.AUTH_SERVICE_URL;

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { user: { id: 1 } },
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await guard.canActivate(context);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://auth-service:3003/api/auth/verify',
        expect.any(Object),
      );

      if (originalEnv) {
        process.env.AUTH_SERVICE_URL = originalEnv;
      }
    });

    it("devrait utiliser l'URL personnalisée du service d'authentification", async () => {
      const context = createMockExecutionContext('Bearer token');
      const customUrl = 'http://custom-auth:4000';
      process.env.AUTH_SERVICE_URL = customUrl;

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { user: { id: 1 } },
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await guard.canActivate(context);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${customUrl}/api/auth/verify`,
        expect.any(Object),
      );
    });

    it("devrait lancer une exception si le service d'authentification retourne une erreur", async () => {
      const context = createMockExecutionContext('Bearer invalid-token');

      mockedAxios.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Token invalide ou expiré',
      );
    });

    it("devrait lancer une exception si le status n'est pas 200", async () => {
      const context = createMockExecutionContext('Bearer token');

      mockedAxios.get.mockResolvedValueOnce({
        status: 401,
        data: {},
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Token invalide',
      );
    });

    it('devrait gérer les erreurs axios', async () => {
      const context = createMockExecutionContext('Bearer token');

      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Token expiré' },
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devrait gérer les timeout', async () => {
      const context = createMockExecutionContext('Bearer token');

      mockedAxios.get.mockRejectedValueOnce(new Error('Timeout'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Token invalide ou expiré',
      );
    });

    it("devrait passer le header Authorization au service d'authentification", async () => {
      const authHeader = 'Bearer specific-token-12345';
      const context = createMockExecutionContext(authHeader);

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { user: { id: 1 } },
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await guard.canActivate(context);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: authHeader,
          },
        }),
      );
    });

    it('devrait définir un timeout de 5000ms', async () => {
      const context = createMockExecutionContext('Bearer token');

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { user: { id: 1 } },
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await guard.canActivate(context);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 5000,
        }),
      );
    });

    it('devrait gérer les erreurs non-Error', async () => {
      const context = createMockExecutionContext('Bearer token');

      mockedAxios.get.mockRejectedValueOnce('String error');

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
