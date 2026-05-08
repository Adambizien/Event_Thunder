import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

type AuthServiceMock = {
  generateGoogleAuthUrl: jest.Mock;
  googleAuth: jest.Mock;
  register: jest.Mock;
  login: jest.Mock;
  verifyToken: jest.Mock;
  getHealth: jest.Mock;
  forgotPassword: jest.Mock;
  verifyResetToken: jest.Mock;
  resetPassword: jest.Mock;
  logout: jest.Mock;
};

type ResponseMock = Response & {
  setHeader: jest.Mock<void, [string, string]>;
  send: jest.Mock<void, [string]>;
};

const createService = (): AuthServiceMock => ({
  generateGoogleAuthUrl: jest.fn(),
  googleAuth: jest.fn(),
  register: jest.fn(),
  login: jest.fn(),
  verifyToken: jest.fn(),
  getHealth: jest.fn(),
  forgotPassword: jest.fn(),
  verifyResetToken: jest.fn(),
  resetPassword: jest.fn(),
  logout: jest.fn(),
});

const createResponse = (): ResponseMock =>
  ({
    setHeader: jest.fn<void, [string, string]>(),
    send: jest.fn<void, [string]>(),
  }) as unknown as ResponseMock;

describe('AuthController', () => {
  let service: AuthServiceMock;
  let controller: AuthController;

  beforeEach(() => {
    service = createService();
    controller = new AuthController(service as unknown as AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegue register, login et health au service', async () => {
    service.register.mockResolvedValue({ token: 'register-token' });
    service.login.mockResolvedValue({ token: 'login-token' });
    service.getHealth.mockReturnValue({ message: 'Auth service is running' });

    await expect(
      controller.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongPass123!',
      }),
    ).resolves.toEqual({ token: 'register-token' });
    await expect(
      controller.login({
        email: 'john@example.com',
        password: 'StrongPass123!',
      }),
    ).resolves.toEqual({ token: 'login-token' });
    expect(controller.health()).toEqual({ message: 'Auth service is running' });
  });

  it('verifie le token avec l id du user authentifie', () => {
    service.verifyToken.mockResolvedValue({ user: { id: 'user-1' } });

    expect(
      controller.verifyToken({
        user: { id: 'user-1', email: 'john@example.com' },
      } as never),
    ).toEqual(Promise.resolve({ user: { id: 'user-1' } }));
    expect(service.verifyToken).toHaveBeenCalledWith('user-1');
  });

  it('refuse verify sans utilisateur authentifie', () => {
    expect(() => controller.verifyToken({} as never)).toThrow(
      BadRequestException,
    );
  });

  it('normalise le token query array pour verify-reset-token', () => {
    service.verifyResetToken.mockReturnValue({
      valid: true,
      message: 'Jeton valide',
    });

    expect(controller.verifyResetToken(['reset-token', 'ignored'])).toEqual({
      valid: true,
      message: 'Jeton valide',
    });
    expect(service.verifyResetToken).toHaveBeenCalledWith('reset-token');
  });

  it('recupere le token Authorization au logout', () => {
    service.logout.mockReturnValue({ message: 'Déconnexion réussie' });

    expect(
      controller.logout({
        headers: { authorization: 'Bearer token' },
        user: { id: 'user-1', email: 'john@example.com' },
      } as never),
    ).toEqual({ message: 'Déconnexion réussie' });
    expect(service.logout).toHaveBeenCalledWith('Bearer token');
  });

  it('sert une page de callback Google success avec payload securise', async () => {
    service.googleAuth.mockResolvedValue({
      token: 'token',
      user: {
        id: 'user-1',
        email: 'john@example.com',
        firstName: '<John>',
        lastName: 'Doe',
      },
    });
    const res = createResponse();

    await controller.googleAuthCallback('code%201', {}, res);

    expect(service.googleAuth).toHaveBeenCalledWith({ code: 'code 1' });
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send.mock.calls[0][0]).toContain('OAUTH_SUCCESS');
    expect(res.send.mock.calls[0][0]).toContain('&lt;John&gt;');
  });

  it('sert une page erreur Google quand le code manque', async () => {
    const res = createResponse();

    await controller.googleAuthCallback('', { error: 'access_denied' }, res);

    expect(service.googleAuth).not.toHaveBeenCalled();
    expect(res.send.mock.calls[0][0]).toContain('OAUTH_ERROR');
    expect(res.send.mock.calls[0][0]).toContain('no_code');
  });
});
