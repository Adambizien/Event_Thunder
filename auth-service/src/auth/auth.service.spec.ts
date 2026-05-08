import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { HttpService } from '@nestjs/axios';
import type { JwtService } from '@nestjs/jwt';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import type { RabbitmqPublisherService } from './rabbitmq-publisher.service';
import { readSecret } from '../utils/secret.util';

jest.mock('../utils/secret.util', () => ({
  readSecret: jest.fn(),
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn().mockReturnValue('https://google.test/auth'),
    getToken: jest.fn(),
    setCredentials: jest.fn(),
    verifyIdToken: jest.fn(),
  })),
}));

type UserPayload = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  planId?: string;
};

type HttpMock = {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
};

type JwtMock = {
  sign: jest.Mock;
  verify: jest.Mock;
  decode: jest.Mock;
};

const createUser = (overrides: Partial<UserPayload> = {}): UserPayload => ({
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phoneNumber: '0612345678',
  role: 'User',
  planId: 'plan-free',
  ...overrides,
});

describe('AuthService', () => {
  const readSecretMock = readSecret as jest.MockedFunction<typeof readSecret>;
  let jwt: JwtMock;
  let http: HttpMock;
  let publishWithRetry: jest.Mock<
    Promise<void>,
    [string, Record<string, unknown>]
  >;
  let service: AuthService;

  beforeEach(() => {
    process.env.USER_SERVICE_URL = 'http://user.test';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.FRONTEND_URL = 'http://frontend.test';

    readSecretMock.mockImplementation((name: string) => {
      if (name === 'GOOGLE_CLIENT_SECRET') return 'google-secret';
      if (name === 'JWT_SECRET') return 'jwt-secret';
      if (name === 'RESET_PASSWORD_JWT_SECRET') return 'reset-secret';
      return undefined;
    });

    jwt = {
      sign: jest.fn((payload: Record<string, unknown>) =>
        payload.type === 'password_reset' ? 'reset-token' : 'access-token',
      ),
      verify: jest.fn((token: string) => {
        if (token === 'bad-token') {
          throw new Error('invalid token');
        }
        if (token === 'reset-token') {
          return { type: 'password_reset', email: 'john@example.com' };
        }
        return { id: 'user-1' };
      }),
      decode: jest.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 1800 })),
    };
    http = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };
    publishWithRetry = jest
      .fn<Promise<void>, [string, Record<string, unknown>]>()
      .mockResolvedValue(undefined);

    service = new AuthService(
      jwt as unknown as JwtService,
      http as unknown as HttpService,
      { publishWithRetry } as unknown as RabbitmqPublisherService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.USER_SERVICE_URL;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.FRONTEND_URL;
  });

  it('inscrit un utilisateur via user-service, genere un token et publie le welcome mail', async () => {
    const user = createUser();
    http.post.mockReturnValue(of({ data: { user } }));

    await expect(
      service.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '0612345678',
        password: 'StrongPass123!',
      }),
    ).resolves.toEqual({
      message: 'Utilisateur enregistré avec succès',
      token: 'access-token',
      user,
    });

    expect(http.post).toHaveBeenCalledWith('http://user.test/api/users', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '0612345678',
      password: 'StrongPass123!',
    });
    expect(jwt.sign).toHaveBeenCalledWith({ id: 'user-1' });
    expect(publishWithRetry).toHaveBeenCalledWith('auth.mail.welcome', {
      email: 'john@example.com',
      username: 'John',
    });
  });

  it('connecte un utilisateur valide via user-service verify', async () => {
    const user = createUser({ role: 'Admin' });
    http.post.mockReturnValue(of({ data: { user } }));

    await expect(
      service.login({
        email: 'john@example.com',
        password: 'StrongPass123!',
      }),
    ).resolves.toEqual({
      message: 'Connexion réussie',
      token: 'access-token',
      user,
    });

    expect(http.post).toHaveBeenCalledWith(
      'http://user.test/api/users/verify',
      {
        email: 'john@example.com',
        password: 'StrongPass123!',
      },
    );
  });

  it('refuse login quand user-service ne renvoie pas d id', async () => {
    http.post.mockReturnValue(
      of({ data: { user: { email: 'john@example.com' } } }),
    );

    await expect(
      service.login({
        email: 'john@example.com',
        password: 'WrongPass123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifie le token en rechargeant le user depuis user-service', async () => {
    const user = createUser();
    http.get.mockReturnValue(of({ data: { user } }));

    await expect(service.verifyToken('user-1')).resolves.toEqual({ user });
    expect(http.get).toHaveBeenCalledWith('http://user.test/api/users/user-1');
  });

  it('envoie un lien de reset password sans reveler si email existe', async () => {
    http.get.mockReturnValue(of({ data: { user: createUser() } }));

    await expect(
      service.forgotPassword({ email: 'john@example.com' }),
    ).resolves.toEqual({
      message: "Si l'email existe, un lien de réinitialisation a été envoyé",
    });

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'password_reset',
        email: 'john@example.com',
      }),
      {
        secret: 'reset-secret',
        expiresIn: '30m',
      },
    );
    expect(publishWithRetry).toHaveBeenCalledWith(
      'auth.mail.password-reset',
      expect.objectContaining({
        email: 'john@example.com',
        resetUrl: 'http://frontend.test/reset-password?token=reset-token',
        username: 'John',
        expiresInMinutes: 30,
      }),
    );
  });

  it('reinitialise le mot de passe puis refuse la reutilisation du meme token', async () => {
    http.patch.mockReturnValue(of({ data: { message: 'ok' } }));

    await expect(
      service.resetPassword({
        token: 'reset-token',
        newPassword: 'NewStrongPass123!',
      }),
    ).resolves.toEqual({
      message: 'Mot de passe réinitialisé avec succès',
    });

    expect(http.patch).toHaveBeenCalledWith(
      'http://user.test/api/users/password',
      {
        email: 'john@example.com',
        newPassword: 'NewStrongPass123!',
      },
    );
    await expect(
      service.resetPassword({
        token: 'reset-token',
        newPassword: 'OtherStrongPass123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('valide les reset tokens et rejette les tokens invalides', () => {
    expect(service.verifyResetToken('reset-token')).toEqual({
      valid: true,
      message: 'Jeton valide',
    });
    expect(service.verifyResetToken('bad-token')).toEqual({
      valid: false,
      message: 'Jeton invalide ou expiré',
    });
    expect(service.verifyResetToken('')).toEqual({
      valid: false,
      message: 'Jeton manquant',
    });
  });

  it('blackliste un token au logout et refuse un token invalide', () => {
    expect(service.logout('Bearer access-token')).toEqual({
      message: 'Déconnexion réussie',
    });
    expect(service.isTokenBlacklisted('access-token')).toBe(true);

    expect(() => service.logout('Bearer bad-token')).toThrow(
      UnauthorizedException,
    );
  });
});
