import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

type AuthenticatedRequest = { user?: { id: string } };

describe('Auth service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const authService = {
    generateGoogleAuthUrl: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    verifyToken: jest.fn(),
    getHealth: jest.fn(),
    forgotPassword: jest.fn(),
    verifyResetToken: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
          req.user = { id: 'user-1' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the service health status', () => {
    authService.getHealth.mockReturnValue({ status: 'ok' });
    return request(httpServer)
      .get('/auth/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('registers a user through the public API', async () => {
    const payload = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'Password123!',
    };
    authService.register.mockResolvedValue({
      token: 'jwt-token',
      user: { id: 'user-1', email: payload.email },
    });

    await request(httpServer)
      .post('/auth/register')
      .send(payload)
      .expect(201)
      .expect({
        token: 'jwt-token',
        user: { id: 'user-1', email: payload.email },
      });

    expect(authService.register).toHaveBeenCalledWith(payload);
  });

  it('verifies the authenticated user from the JWT guard payload', async () => {
    authService.verifyToken.mockResolvedValue({
      user: { id: 'user-1', email: 'ada@example.com' },
    });

    await request(httpServer)
      .get('/auth/verify')
      .set('Authorization', 'Bearer jwt-token')
      .expect(200)
      .expect({ user: { id: 'user-1', email: 'ada@example.com' } });

    expect(authService.verifyToken).toHaveBeenCalledWith('user-1');
  });
});
