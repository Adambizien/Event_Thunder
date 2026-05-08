import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { ProxyController } from './proxy.controller';
import type { ProxyResult, ProxyService } from './proxy.service';

type RequestMock = Request & {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  body: Record<string, unknown>;
  get: Request['get'] & jest.Mock;
};

type ResponseMock = Response & {
  status: jest.Mock<ResponseMock, [number]>;
  send: jest.Mock<ResponseMock, [unknown]>;
  json: jest.Mock<ResponseMock, [unknown]>;
  setHeader: jest.Mock<void, [string, string | number | readonly string[]]>;
};

type ProxyServiceMock = {
  forward: jest.Mock<Promise<ProxyResult>, [Request]>;
};

type AuthGuardMock = {
  authenticateRequest: jest.Mock<
    Promise<{ id: string; email: string; role: string }>,
    [Request]
  >;
};

const createHeaderGetter = (value?: string): Request['get'] & jest.Mock => {
  const get = jest.fn((name: string): string | string[] | undefined =>
    name.toLowerCase() === 'set-cookie' ? undefined : value,
  );

  return get as Request['get'] & jest.Mock;
};

const createRequest = (overrides: Partial<RequestMock>): RequestMock =>
  ({
    method: 'GET',
    originalUrl: '/api/auth/login',
    path: '/api/auth/login',
    headers: {},
    body: {},
    get: createHeaderGetter(),
    ...overrides,
  }) as RequestMock;

const createResponse = (): ResponseMock => {
  const res = {
    status: jest.fn(),
    send: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as ResponseMock;

  res.status.mockReturnValue(res);
  res.send.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

describe('ProxyController', () => {
  let proxy: ProxyServiceMock;
  let authGuard: AuthGuardMock;
  let controller: ProxyController;

  beforeEach(() => {
    proxy = {
      forward: jest.fn<Promise<ProxyResult>, [Request]>().mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { ok: true },
      }),
    };
    authGuard = {
      authenticateRequest: jest.fn<
        Promise<{ id: string; email: string; role: string }>,
        [Request]
      >(),
    };
    controller = new ProxyController(
      proxy as unknown as ProxyService,
      authGuard as unknown as AuthGuard,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwarde une route publique sans authentification', async () => {
    const req = createRequest({
      method: 'POST',
      originalUrl: '/api/auth/login',
      path: '/api/auth/login',
      body: { email: 'john@example.com' },
    });
    const res = createResponse();

    await controller.handle(req, res);

    expect(authGuard.authenticateRequest).not.toHaveBeenCalled();
    expect(proxy.forward).toHaveBeenCalledWith(req);
    expect(res.setHeader).toHaveBeenCalledWith(
      'content-type',
      'application/json',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ ok: true });
  });

  it('authentifie une route protegee et transmet les headers utilisateur', async () => {
    authGuard.authenticateRequest.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      role: 'User',
    });
    const req = createRequest({
      method: 'GET',
      originalUrl: '/api/subscriptions/user/user-1',
      path: '/api/subscriptions/user/user-1',
    });
    const res = createResponse();

    await controller.handle(req, res);

    expect(authGuard.authenticateRequest).toHaveBeenCalledWith(req);
    expect(req.headers['x-user-id']).toBe('user-1');
    expect(req.headers['x-user-role']).toBe('User');
    expect(proxy.forward).toHaveBeenCalledWith(req);
  });

  it('refuse une route admin a un utilisateur non admin', async () => {
    authGuard.authenticateRequest.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      role: 'User',
    });
    const req = createRequest({
      method: 'GET',
      originalUrl: '/api/users',
      path: '/api/users',
    });
    const res = createResponse();

    await controller.handle(req, res);

    expect(proxy.forward).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Accès administrateur requis',
      error: ForbiddenException.name,
    });
  });

  it('force lemail utilisateur sur les changements de profil et mot de passe', async () => {
    authGuard.authenticateRequest.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      role: 'User',
    });
    const profileReq = createRequest({
      method: 'PUT',
      originalUrl: '/api/users/profile',
      path: '/api/users/profile',
      body: { currentEmail: 'other@example.com', firstName: 'John' },
    });
    const passwordReq = createRequest({
      method: 'PUT',
      originalUrl: '/api/users/password',
      path: '/api/users/password',
      body: { email: 'john@example.com', newPassword: 'StrongPass123!' },
    });

    await controller.handle(profileReq, createResponse());
    await controller.handle(passwordReq, createResponse());

    expect((profileReq.body as Record<string, unknown>).currentEmail).toBe(
      'john@example.com',
    );
    expect((passwordReq.body as Record<string, unknown>).email).toBe(
      'john@example.com',
    );
  });

  it('bloque le changement de mot de passe avec un email different', async () => {
    authGuard.authenticateRequest.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      role: 'User',
    });
    const req = createRequest({
      method: 'PUT',
      originalUrl: '/api/users/password',
      path: '/api/users/password',
      body: { email: 'other@example.com' },
    });
    const res = createResponse();

    await controller.handle(req, res);

    expect(proxy.forward).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Modification de mot de passe refusée',
      error: ForbiddenException.name,
    });
  });

  it('ignore une auth optionnelle invalide sur les routes publiques consultables', async () => {
    authGuard.authenticateRequest.mockRejectedValue(new Error('bad token'));
    const req = createRequest({
      method: 'GET',
      originalUrl: '/api/events/event-1',
      path: '/api/events/event-1',
      get: createHeaderGetter('Bearer bad'),
    });

    await controller.handle(req, createResponse());

    expect(req.user).toBeUndefined();
    expect(proxy.forward).toHaveBeenCalledWith(req);
  });

  it('renvoie une erreur passerelle quand le proxy echoue', async () => {
    proxy.forward.mockRejectedValue(new Error('service down'));
    const req = createRequest({
      method: 'POST',
      originalUrl: '/api/auth/login',
      path: '/api/auth/login',
    });
    const res = createResponse();

    await controller.handle(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Erreur de passerelle',
      error: 'service down',
    });
  });
});
