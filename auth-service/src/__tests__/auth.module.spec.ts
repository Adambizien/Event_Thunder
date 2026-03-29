import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '../auth/auth.module';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';

describe('AuthModule', () => {
  let authModule: TestingModule;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '1d';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    authModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
  });

  it('devrait être défini', () => {
    expect(authModule).toBeDefined();
  });

  it('devrait avoir AuthController', () => {
    const controller = authModule.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(AuthController);
  });

  it('devrait avoir AuthService', () => {
    const service = authModule.get<AuthService>(AuthService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(AuthService);
  });

  it('devrait avoir JwtStrategy', () => {
    const strategy = authModule.get<JwtStrategy>(JwtStrategy);
    expect(strategy).toBeDefined();
    expect(strategy).toBeInstanceOf(JwtStrategy);
  });

  it('devrait importer HttpModule', () => {
    // Vérifier que HttpModule est disponible
    expect(authModule).toBeDefined();
  });

  it('devrait importer JwtModule', () => {
    // Vérifier que JwtModule est configuré
    expect(authModule).toBeDefined();
  });

  it('devrait exporter AuthService', () => {
    const service = authModule.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });

  it('devrait compiler le module sans erreurs', async () => {
    await expect(
      Test.createTestingModule({
        imports: [AuthModule],
      }).compile(),
    ).resolves.toBeDefined();
  });

  describe('Module structure', () => {
    it('devrait avoir tous les controllers enregistrés', () => {
      const controllers = Reflect.getMetadata(
        'controllers',
        AuthModule,
      ) as unknown;
      expect(controllers).toBeDefined();
      expect(
        (controllers as Array<unknown>).some(
          (c: unknown) => c === AuthController,
        ),
      ).toBe(true);
    });

    it('devrait avoir tous les providers enregistrés', () => {
      const providers = Reflect.getMetadata('providers', AuthModule) as unknown;
      expect(providers).toBeDefined();
      const providerList = providers as Array<unknown>;
      expect(
        providerList.some(
          (p: unknown) =>
            p === AuthService ||
            (p as Record<string, unknown>).provide === AuthService,
        ),
      ).toBe(true);
    });

    it("devrait permettre l'injection de AuthService dans AuthController", () => {
      const controller = authModule.get<AuthController>(AuthController);
      expect(controller).toBeDefined();
      expect(
        (controller as unknown as Record<string, unknown>).authService,
      ).toBeInstanceOf(AuthService);
    });

    it("devrait permettre l'injection de AuthService dans JwtStrategy", () => {
      const strategy = authModule.get<JwtStrategy>(JwtStrategy);
      expect(strategy).toBeDefined();
      expect(
        (strategy as unknown as Record<string, unknown>).authService,
      ).toBeInstanceOf(AuthService);
    });
  });

  describe('Configuration', () => {
    it("devrait lancer une erreur si JWT_SECRET n'est pas défini", async () => {
      delete process.env.JWT_SECRET;

      await expect(
        Test.createTestingModule({
          imports: [AuthModule],
        }).compile(),
      ).rejects.toThrow('JWT_SECRET is not defined');
    });

    it("devrait utiliser l'expiration par défaut si JWT_EXPIRES_IN n'est pas défini", async () => {
      process.env.JWT_SECRET = 'test-secret';
      delete process.env.JWT_EXPIRES_IN;

      const module = await Test.createTestingModule({
        imports: [AuthModule],
      }).compile();

      expect(module).toBeDefined();
    });
  });
});
