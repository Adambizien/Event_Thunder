import { Test, TestingModule } from '@nestjs/testing';
import { ProxyService } from '../proxy/proxy.service';
import axios from 'axios';
import { Request } from 'express';
/* eslint-disable */
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProxyService', () => {
  let service: ProxyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProxyService],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    jest.clearAllMocks();
  });

  describe('routeTarget', () => {
    it("devrait retourner l'URL du service d'authentification pour /api/auth", () => {
      const servicePrivate = service as unknown as Record<string, unknown>;
      const routeTargetFn = servicePrivate.routeTarget as (
        path: string,
      ) => string | null;
      const target = routeTargetFn.call(service, '/api/auth/login');
      expect(target).toBe('http://auth-service:3003');
    });

    it("devrait retourner l'URL du service utilisateur pour /api/users", () => {
      const servicePrivate = service as unknown as Record<string, unknown>;
      const routeTargetFn = servicePrivate.routeTarget as (
        path: string,
      ) => string | null;
      const target = routeTargetFn.call(service, '/api/users/profile');
      expect(target).toBe('http://user-service:3002');
    });

    it('devrait retourner null pour un chemin non reconnu', () => {
      const servicePrivate = service as unknown as Record<string, unknown>;
      const routeTargetFn = servicePrivate.routeTarget as (
        path: string,
      ) => string | null;
      const target = routeTargetFn.call(service, '/api/unknown');
      expect(target).toBeNull();
    });

    it("devrait utiliser les variables d'environnement si définies", () => {
      process.env.AUTH_SERVICE_URL = 'http://custom-auth:5000';
      const servicePrivate = service as unknown as Record<string, unknown>;
      const routeTargetFn = servicePrivate.routeTarget as (
        path: string,
      ) => string | null;
      const target = routeTargetFn.call(service, '/api/auth/test');
      expect(target).toBe('http://custom-auth:5000');
      delete process.env.AUTH_SERVICE_URL;
    });

    it("devrait utiliser l'URL du service utilisateur personnalisé", () => {
      process.env.USER_SERVICE_URL = 'http://custom-user:6000';
      const servicePrivate = service as unknown as Record<string, unknown>;
      const routeTargetFn = servicePrivate.routeTarget as (
        path: string,
      ) => string | null;
      const target = routeTargetFn.call(service, '/api/users/list');
      expect(target).toBe('http://custom-user:6000');
      delete process.env.USER_SERVICE_URL;
    });
  });

  describe('forward', () => {
    it('devrait transférer une requête GET avec succès', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/verify',
        headers: {
          authorization: 'Bearer token',
          'user-agent': 'test',
        },
        query: { param: 'value' },
        body: undefined,
      } as unknown as Request;

      const mockResponse = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { success: true },
      };

      mockedAxios.request.mockResolvedValue(mockResponse);

      const result = await service.forward(mockRequest);

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ success: true });
      expect(result.headers).toEqual({ 'content-type': 'application/json' });
    });

    it('devrait lancer une erreur pour un chemin sans service cible', async () => {
      const mockRequest = {
        originalUrl: '/api/unknown',
      } as Request;

      await expect(service.forward(mockRequest)).rejects.toThrow(
        'Aucun service cible pour ce chemin',
      );
    });

    it("devrait construire l'URL correctement", async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/login',
        headers: {},
        query: {},
        body: undefined,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: {},
      });

      await service.forward(mockRequest);

       
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://auth-service:3003/api/auth/login',
        }),
      );
    });

    it('devrait passer la méthode HTTP correctement', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const mockRequest = {
          method,
          originalUrl: '/api/auth/test',
          headers: {},
          query: {},
          body: {},
        } as unknown as Request;

        mockedAxios.request.mockResolvedValue({
          status: 200,
          headers: {},
          data: {},
        });

        await service.forward(mockRequest);

         
        expect(mockedAxios.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method,
          }),
        );
      }
    });

    it('devrait passer les headers sans le host', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/test',
        headers: {
          authorization: 'Bearer token',
          'content-type': 'application/json',
          host: 'localhost:3000',
        },
        query: {},
        body: undefined,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: {},
      });

      await service.forward(mockRequest);

       
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            authorization: 'Bearer token',
            'content-type': 'application/json',
            host: undefined,
          },
        }),
      );
    });

    it('devrait passer les paramètres de requête', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/users/search',
        headers: {},
        query: { name: 'John', age: '30' },
        body: undefined,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: {},
      });

      await service.forward(mockRequest);

       
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { name: 'John', age: '30' },
        }),
      );
    });

    it('devrait passer le corps de la requête pour les requêtes POST', async () => {
      const mockBody = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockRequest = {
        method: 'POST',
        originalUrl: '/api/auth/login',
        headers: {},
        query: {},
        body: mockBody,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: {},
      });

      await service.forward(mockRequest);

       
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockBody,
        }),
      );
    });

    it('devrait configurer validateStatus pour accepter tous les codes', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/test',
        headers: {},
        query: {},
        body: undefined,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 404,
        headers: {},
        data: { error: 'Not found' },
      });

      const result = await service.forward(mockRequest);

      expect(result.status).toBe(404);
       
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          validateStatus: expect.any(Function),
        }),
      );

      // Vérifier que validateStatus retourne toujours true

      const call = (
        mockedAxios.request.mock.calls[0] as unknown[]
      )[0] as Record<string, unknown>;
      const validateStatus = call.validateStatus as (status: number) => boolean;
      expect(validateStatus(200)).toBe(true);
      expect(validateStatus(404)).toBe(true);
      expect(validateStatus(500)).toBe(true);
    });

    it('devrait définir responseType à arraybuffer', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/test',
        headers: {},
        query: {},
        body: undefined,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: Buffer.from('test'),
      });

      await service.forward(mockRequest);

       
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          responseType: 'arraybuffer',
        }),
      );
    });

    it('devrait définir un timeout de 10000ms', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/test',
        headers: {},
        query: {},
        body: undefined,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: {},
      });

      await service.forward(mockRequest);

       
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
        }),
      );
    });

    it('devrait gérer les réponses avec différents types de données', async () => {
      const testCases = [
        { data: { json: 'object' } },
        { data: 'string response' },
        { data: Buffer.from('buffer') },
      ];

      for (const testCase of testCases) {
        const mockRequest = {
          method: 'GET',
          originalUrl: '/api/auth/test',
          headers: {},
          query: {},
          body: undefined,
        } as unknown as Request;

        mockedAxios.request.mockResolvedValue({
          status: 200,
          headers: {},
          data: testCase.data,
        });

        const result = await service.forward(mockRequest);

        expect(result.data).toEqual(testCase.data);
      }
    });

    it('devrait propager les erreurs axios', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/test',
        headers: {},
        query: {},
        body: undefined,
      } as unknown as Request;

      const error = new Error('Network error');
      mockedAxios.request.mockRejectedValue(error);

      await expect(service.forward(mockRequest)).rejects.toThrow(
        'Network error',
      );
    });

    it('devrait gérer les requêtes vers le service utilisateur', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/users/profile',
        headers: {},
        query: {},
        body: undefined,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: { user: 'data' },
      });

      const result = await service.forward(mockRequest);

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://user-service:3002/api/users/profile',
        }),
      );
      expect(result.status).toBe(200);
    });

    it("devrait gérer les codes d'erreur HTTP", async () => {
      const errorCodes = [400, 401, 403, 404, 500, 502, 503];

      for (const code of errorCodes) {
        const mockRequest = {
          method: 'GET',
          originalUrl: '/api/auth/test',
          headers: {},
          query: {},
          body: undefined,
        } as unknown as Request;

        mockedAxios.request.mockResolvedValue({
          status: code,
          headers: {},
          data: { error: 'Error message' },
        });

        const result = await service.forward(mockRequest);

        expect(result.status).toBe(code);
      }
    });

    it('devrait gérer les headers de réponse complexes', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/test',
        headers: {},
        query: {},
        body: undefined,
      } as unknown as Request;

      const complexHeaders = {
        'content-type': 'application/json',
        'x-custom-header': 'value',
        'set-cookie': ['cookie1=value1', 'cookie2=value2'],
        'cache-control': 'no-cache',
      };

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: complexHeaders,
        data: {},
      });

      const result = await service.forward(mockRequest);

      expect(result.headers).toEqual(complexHeaders);
    });

    it('devrait gérer les URLs avec des paramètres complexes', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/users/search?filter=active&sort=name&page=1',
        headers: {},
        query: { filter: 'active', sort: 'name', page: '1' },
        body: undefined,
      } as unknown as Request;

      mockedAxios.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: [],
      });

      await service.forward(mockRequest);

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://user-service:3002/api/users/search?filter=active&sort=name&page=1',
          params: { filter: 'active', sort: 'name', page: '1' },
        }),
      );
    });
  });
});
