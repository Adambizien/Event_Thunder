import { Test, TestingModule } from '@nestjs/testing';
import { ProxyModule } from '../proxy/proxy.module';
import { ProxyService } from '../proxy/proxy.service';
import { ProxyController } from '../proxy/proxy.controller';
import { AuthGuard } from '../auth/auth.guard';
/* eslint-disable */
describe('ProxyModule', () => {
  let proxyModule: TestingModule;

  beforeEach(async () => {
    proxyModule = await Test.createTestingModule({
      imports: [ProxyModule],
    }).compile();
  });

  it('devrait être défini', () => {
    expect(proxyModule).toBeDefined();
  });

  it('devrait avoir ProxyService', () => {
    const service = proxyModule.get<ProxyService>(ProxyService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ProxyService);
  });

  it('devrait avoir ProxyController', () => {
    const controller = proxyModule.get<ProxyController>(ProxyController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ProxyController);
  });

  it('devrait avoir AuthGuard', () => {
    const guard = proxyModule.get<AuthGuard>(AuthGuard);
    expect(guard).toBeDefined();
    expect(guard).toBeInstanceOf(AuthGuard);
  });

  it('devrait compiler le module sans erreurs', async () => {
    await expect(
      Test.createTestingModule({
        imports: [ProxyModule],
      }).compile(),
    ).resolves.toBeDefined();
  });

  describe('Module structure', () => {
    it('devrait avoir tous les providers enregistrés', () => {
      const providers = Reflect.getMetadata('providers', ProxyModule);
      expect(providers).toContain(ProxyService);
      expect(providers).toContain(AuthGuard);
    });

    it('devrait avoir tous les controllers enregistrés', () => {
      const controllers = Reflect.getMetadata('controllers', ProxyModule);
      expect(controllers).toContain(ProxyController);
    });

    it("devrait permettre l'injection de ProxyService dans ProxyController", () => {
      const controller = proxyModule.get<ProxyController>(ProxyController);
      expect(controller).toBeDefined();
      expect((controller as any).proxy).toBeInstanceOf(ProxyService);
    });
  });
});
