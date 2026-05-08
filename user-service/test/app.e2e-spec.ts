import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { AdminGuard } from '../src/auth/admin.guard';

type AuthenticatedRequest = {
  user?: { id: string; email: string; role: string };
};

describe('User service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const usersService = {
    create: jest.fn(),
    verify: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
    updateProfile: jest.fn(),
    updatePasswordWithEmail: jest.fn(),
    healthCheck: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUser: jest.fn(),
    updateRole: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
          req.user = {
            id: 'user-1',
            email: 'ada@example.com',
            role: 'Admin',
          };
          return true;
        },
      })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('exposes service health', () => {
    return request(httpServer)
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', message: 'User service is running' });
  });

  it('creates a user through the public API', async () => {
    const payload = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'Password123!',
    };
    usersService.create.mockResolvedValue({ id: 'user-1', ...payload });

    await request(httpServer)
      .post('/api/users')
      .send(payload)
      .expect(201)
      .expect({ id: 'user-1', ...payload });

    expect(usersService.create).toHaveBeenCalledWith(payload);
  });

  it('updates the authenticated user profile', async () => {
    const payload = {
      currentEmail: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Byron',
    };
    usersService.updateProfile.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Byron',
    });

    await request(httpServer)
      .put('/api/users/profile')
      .set('Authorization', 'Bearer jwt-token')
      .send(payload)
      .expect(200)
      .expect({
        id: 'user-1',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Byron',
      });
  });
});
