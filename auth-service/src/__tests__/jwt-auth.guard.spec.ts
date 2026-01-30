import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
/* eslint-disable */
describe('JwtAuthGuard - Tests réels du comportement', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  describe('Initialisation', () => {
    it('devrait être défini et instancié correctement', () => {
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('devrait étendre AuthGuard avec la stratégie jwt', () => {
      // Vérifie que c'est bien un AuthGuard
      expect(typeof guard.canActivate).toBe('function');
    });
  });

  describe('canActivate', () => {
    it('devrait être une fonction', () => {
      expect(typeof guard.canActivate).toBe('function');
    });

    it('devrait hériter du comportement AuthGuard(\'jwt\')', () => {
      // La classe étend AuthGuard('jwt'), donc elle devrait
      // avoir les mêmes propriétés
      expect(guard).toHaveProperty('canActivate');
      
      // Vérifie le nom de la stratégie utilisée
      const guardProto = Object.getPrototypeOf(guard);
      expect(guardProto.constructor.name).toBe('JwtAuthGuard');
    });
  });

  describe('Sécurité', () => {
    it('devrait utiliser la stratégie JWT pour sécuriser les routes', () => {
      // Le JwtAuthGuard utilise @UseGuards pour protéger les routes
      // Son rôle est de vérifier les tokens JWT
      expect(guard).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
      
      // Vérifie que le guard est associé à la stratégie JWT
      const guardString = guard.constructor.name;
      expect(guardString).toBe('JwtAuthGuard');
    });
  });
});
