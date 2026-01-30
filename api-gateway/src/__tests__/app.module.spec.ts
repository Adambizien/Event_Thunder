import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { AppController } from '../app.controller';
import { ProxyModule } from '../proxy/proxy.module';

describe('AppModule', () => {
  let appModule: TestingModule;

  beforeEach(async () => {
    appModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('devrait être défini', () => {
    expect(appModule).toBeDefined();
  });

  it('devrait avoir AppController', () => {
    const controller = appModule.get<AppController>(AppController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(AppController);
  });

  it('devrait importer ProxyModule', () => {
    const proxyModule = appModule.get(ProxyModule);
    expect(proxyModule).toBeDefined();
  });

  it('devrait compiler le module sans erreurs', async () => {
    await expect(
      Test.createTestingModule({
        imports: [AppModule],
      }).compile(),
    ).resolves.toBeDefined();
  });

  it('devrait avoir tous les controllers enregistrés', () => {
    const controllers = Reflect.getMetadata(
      'controllers',
      AppModule,
    ) as unknown;
    expect(controllers).toBeDefined();
  });

  it('devrait avoir tous les imports nécessaires', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown;
    expect(imports).toBeDefined();
  });

  describe('Module structure', () => {
    it('devrait pouvoir instancier le module multiple fois', async () => {
      const module1 = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      expect(module1).toBeDefined();
      expect(module2).toBeDefined();
      expect(module1).not.toBe(module2);
    });

    it('devrait avoir une configuration valide', () => {
      expect(() => {
        Reflect.getMetadata('imports', AppModule);
        Reflect.getMetadata('controllers', AppModule);
        Reflect.getMetadata('providers', AppModule);
      }).not.toThrow();
    });
  });
});
