import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [],
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
});
