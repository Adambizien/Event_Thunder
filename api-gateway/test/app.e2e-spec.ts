import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Request } from 'express';
import { AppController } from '../src/app.controller';
import { ProxyController } from '../src/proxy/proxy.controller';
import { ProxyService } from '../src/proxy/proxy.service';
import { AuthGuard } from '../src/auth/auth.guard';

describe('API Gateway (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const proxy = {
    forward: jest.fn(),
  };
  const authGuard = {
    authenticateRequest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, ProxyController],
      providers: [
        { provide: ProxyService, useValue: proxy },
        { provide: AuthGuard, useValue: authGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('exposes the health endpoint', () => {
    return request(httpServer)
      .get('/health')
      .expect(200)
      .expect({ message: 'La passerelle API fonctionne' });
  });

  it('forwards public API requests without authentication', async () => {
    proxy.forward.mockResolvedValue({
      status: 200,
      data: [{ id: 'event-1', title: 'Event Thunder' }],
      headers: { 'x-service': 'event-service' },
    });

    await request(httpServer)
      .get('/api/events/public')
      .expect(200)
      .expect('x-service', 'event-service')
      .expect([{ id: 'event-1', title: 'Event Thunder' }]);

    expect(authGuard.authenticateRequest).not.toHaveBeenCalled();
    expect(proxy.forward).toHaveBeenCalledTimes(1);
  });

  it('authenticates private API requests and forwards user headers', async () => {
    authGuard.authenticateRequest.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'User',
    });
    proxy.forward.mockImplementation((req: Request) =>
      Promise.resolve({
        status: 200,
        data: {
          userId: String(req.headers['x-user-id']),
          userRole: String(req.headers['x-user-role']),
        },
        headers: {},
      }),
    );

    await request(httpServer)
      .get('/api/users/user-1')
      .set('Authorization', 'Bearer token')
      .expect(200)
      .expect({ userId: 'user-1', userRole: 'User' });
  });
});
