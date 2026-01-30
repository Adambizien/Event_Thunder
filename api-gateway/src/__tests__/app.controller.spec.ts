import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../app.controller';
import { AuthGuard } from '../auth/auth.guard';
import type { Request } from 'express';
/* eslint-disable */
describe('AppController', () => {
  let appController: AppController;
  let mockAuthGuard: unknown;

  beforeEach(async () => {
    // Créer un mock du guard qu'on peut contrôler
    mockAuthGuard = {
      canActivate: jest.fn(() => true),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AuthGuard,
          useValue: mockAuthGuard,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  // Tests pour la méthode health
  describe('health', () => {
    it('devrait retourner un message de santé', () => {
      const result = appController.health();
      expect(result).toEqual({
        message: 'La passerelle API fonctionne',
      });
    });

    it('devrait retourner un objet avec la propriété message', () => {
      const result = appController.health();
      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });
  });

  // Tests pour la méthode protectedRoute
  describe('protectedRoute', () => {
    it('devrait retourner un message et les informations utilisateur QUAND le guard autorise', () => {
      const mockGuardInstance = mockAuthGuard as Record<string, unknown>;
      (mockGuardInstance.canActivate as jest.Mock).mockReturnValue(true);

      const mockUser = { id: 1, email: 'test@example.com' };
      const mockRequest = {
        user: mockUser,
      } as unknown as Request & { user?: Record<string, unknown> };

      const result = appController.protectedRoute(mockRequest);

      expect(result).toEqual({
        message: 'Vous avez accédé à une route protégée',
        user: mockUser,
      });
    });

    it('devrait vérifier que le guard est bien appelé pour protéger la route', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        appController.protectedRoute,
      ) as unknown;
      expect(guards).toBeDefined();
      expect((guards as Array<unknown>).length).toBeGreaterThan(0);
    });

    it('devrait retourner null si aucun utilisateur dans la requête', () => {
      const mockRequest = {} as unknown as Request & {
        user?: Record<string, unknown>;
      };

      const result = appController.protectedRoute(mockRequest);

      expect(result).toEqual({
        message: 'Vous avez accédé à une route protégée',
        user: null,
      });
    });

    it('devrait retourner null si user est explicitement null', () => {
      const mockRequest = {
        user: null,
      } as unknown as Request & { user?: Record<string, unknown> };

      const result = appController.protectedRoute(mockRequest);

      expect(result).toEqual({
        message: 'Vous avez accédé à une route protégée',
        user: null,
      });
    });

    it('devrait retourner null si user est explicitement undefined', () => {
      const mockRequest = {
        user: undefined,
      } as unknown as Request & { user?: Record<string, unknown> };

      const result = appController.protectedRoute(mockRequest);

      expect(result).toEqual({
        message: 'Vous avez accédé à une route protégée',
        user: null,
      });
    });

    it('devrait retourner un objet avec message et user', () => {
      const mockRequest = {
        user: { id: 2, username: 'john' },
      } as unknown as Request & { user?: Record<string, unknown> };

      const result = appController.protectedRoute(mockRequest);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({ id: 2, username: 'john' });
    });

    it('devrait gérer un utilisateur avec des propriétés complexes', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        roles: ['admin', 'user'],
        metadata: { lastLogin: '2026-01-30' },
      };
      const mockRequest = {
        user: mockUser,
      } as unknown as Request & { user?: Record<string, unknown> };

      const result = appController.protectedRoute(mockRequest);

      expect(result.user).toEqual(mockUser);
      expect(result.message).toBe('Vous avez accédé à une route protégée');
    });
  });
});
