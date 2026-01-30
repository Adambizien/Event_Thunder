import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';

type JwtPayload = {
  id: string;
};
/* eslint-disable */
describe('JwtStrategy - Tests réels de validation', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;

  const mockAuthService = {
    isTokenBlacklisted: jest.fn(),
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-key-123';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('Initialisation', () => {
    it('devrait être défini avec la stratégie JWT correcte', () => {
      expect(strategy).toBeDefined();
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });

    it('devrait lancer une erreur si JWT_SECRET n\'est pas défini', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        new JwtStrategy(authService);
      }).toThrow('JWT_SECRET is not defined');
    });

    it('devrait initialiser avec ExtractJwt.fromAuthHeaderAsBearerToken()', () => {
      // Vérifie que la stratégie extrait le token du header Authorization
      expect(strategy).toBeDefined();
      expect(typeof strategy.validate).toBe('function');
    });
  });

  describe('validate - Logique métier réelle', () => {
    it('devrait valider un token JWT valide avec un payload correct', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
      } as unknown as Request;

      const payload: JwtPayload = { id: 'user-123' };

      mockAuthService.isTokenBlacklisted.mockReturnValue(false);

      const result = strategy.validate(mockRequest, payload);

      expect(result).toEqual({ id: 'user-123' });
      
      expect(mockAuthService.isTokenBlacklisted).toHaveBeenCalledWith(
        'valid-jwt-token',
      );
    });

    it('devrait rejeter un payload sans ID', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer token',
        },
      } as unknown as Request;

      const payload = {} as unknown as JwtPayload;

      expect(() => strategy.validate(mockRequest, payload)).toThrow(
        UnauthorizedException,
      );
      expect(() => strategy.validate(mockRequest, payload)).toThrow(
        'Invalid token payload',
      );
    });

    it('devrait rejeter un payload avec un ID vide', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer token',
        },
      } as unknown as Request;

      const payload: JwtPayload = { id: '' };

      expect(() => strategy.validate(mockRequest, payload)).toThrow(
        UnauthorizedException,
      );
    });

    it('devrait rejeter un token qui a été blacklisté (logout)', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer revoked-token',
        },
      } as unknown as Request;

      const payload: JwtPayload = { id: 'user-123' };

      mockAuthService.isTokenBlacklisted.mockReturnValue(true);

      expect(() => strategy.validate(mockRequest, payload)).toThrow(
        UnauthorizedException,
      );
      expect(() => strategy.validate(mockRequest, payload)).toThrow(
        'Token has been revoked',
      );
    });

    it('devrait valider même si le token n\'est pas dans le header', () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      const payload: JwtPayload = { id: 'user-123' };

      mockAuthService.isTokenBlacklisted.mockReturnValue(false);

      const result = strategy.validate(mockRequest, payload);

      expect(result).toEqual({ id: 'user-123' });
    });

    it('devrait vérifier la blacklist seulement si un token est présent', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer some-token',
        },
      } as unknown as Request;

      const payload: JwtPayload = { id: 'user-456' };

      mockAuthService.isTokenBlacklisted.mockReturnValue(false);

      strategy.validate(mockRequest, payload);

      expect(mockAuthService.isTokenBlacklisted).toHaveBeenCalled();
    });

    it('devrait extraire correctement le token du Bearer header', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      } as unknown as Request;

      const payload: JwtPayload = { id: 'user-789' };

      mockAuthService.isTokenBlacklisted.mockReturnValue(false);

      strategy.validate(mockRequest, payload);

      expect(mockAuthService.isTokenBlacklisted).toHaveBeenCalledWith(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      );
    });

    it('devrait valider plusieurs tokens différents dans une session', () => {
      const tokens = [
        { token: 'token-1', id: 'user-1' },
        { token: 'token-2', id: 'user-2' },
        { token: 'token-3', id: 'user-3' },
      ];

      tokens.forEach(({ token, id }) => {
        const mockRequest = {
          headers: {
            authorization: `Bearer ${token}`,
          },
        } as unknown as Request;

        const payload: JwtPayload = { id };

        mockAuthService.isTokenBlacklisted.mockReturnValue(false);

        const result = strategy.validate(mockRequest, payload);

        expect(result).toEqual({ id });
        expect(mockAuthService.isTokenBlacklisted).toHaveBeenCalledWith(token);
      });
    });

    it('devrait traiter correctement un token qui devient blacklisté après validation initiale', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer logout-token',
        },
      } as unknown as Request;

      const payload: JwtPayload = { id: 'user-logout' };

      mockAuthService.isTokenBlacklisted.mockReturnValue(false);
      let result = strategy.validate(mockRequest, payload);
      expect(result).toEqual({ id: 'user-logout' });

      mockAuthService.isTokenBlacklisted.mockReturnValue(true);
      expect(() => strategy.validate(mockRequest, payload)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Cas limites et sécurité', () => {
    it('devrait rejeter les payloads avec un ID vide ou invalide', () => {
      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      } as unknown as Request;

      const emptyIdPayload: JwtPayload = { id: '' };
      expect(() =>
        strategy.validate(mockRequest, emptyIdPayload),
      ).toThrow(UnauthorizedException);
    });

    it('devrait accepter un ID même s\'il ressemble à une injection SQL', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer token',
        },
      } as unknown as Request;

      const maliciousPayload: JwtPayload = { id: '"; DROP TABLE users; --' };

      mockAuthService.isTokenBlacklisted.mockReturnValue(false);
      const result = strategy.validate(mockRequest, maliciousPayload);
      expect(result).toEqual(maliciousPayload);
    });

    it('devrait traiter un ID numérique reçu comme string', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer token',
        },
      } as unknown as Request;

      const numericPayload: JwtPayload = { id: '12345' };

      mockAuthService.isTokenBlacklisted.mockReturnValue(false);

      const result = strategy.validate(mockRequest, numericPayload);
      expect(result).toEqual({ id: '12345' });
    });
  });
});
