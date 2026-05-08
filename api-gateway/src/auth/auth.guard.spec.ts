import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import axios from 'axios';
import { AuthGuard } from './auth.guard';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

type RequestMock = {
  get: jest.Mock<string | undefined, [string]>;
  user?: Record<string, unknown>;
};

const createContext = (req: RequestMock): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, AUTH_SERVICE_URL: 'http://auth.test' };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('refuse une requete sans header Authorization', async () => {
    const guard = new AuthGuard();
    const req = {
      get: jest.fn<string | undefined, [string]>().mockReturnValue(undefined),
    };

    await expect(
      guard.authenticateRequest(req as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockedAxios.get.mock.calls).toHaveLength(0);
  });

  it('verifie le token aupres du service auth et attache le user', async () => {
    const guard = new AuthGuard();
    const req: RequestMock = {
      get: jest
        .fn<string | undefined, [string]>()
        .mockReturnValue('Bearer abc'),
    };
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: {
        user: { id: 'user-1', email: 'john@example.com', role: 'User' },
      },
    });

    await expect(guard.canActivate(createContext(req))).resolves.toBe(true);

    expect(mockedAxios.get.mock.calls[0]).toEqual([
      'http://auth.test/api/auth/verify',
      {
        headers: { Authorization: 'Bearer abc' },
        timeout: 5000,
      },
    ]);
    expect(req.user).toEqual({
      id: 'user-1',
      email: 'john@example.com',
      role: 'User',
    });
  });

  it('transforme une reponse auth invalide en UnauthorizedException', async () => {
    const guard = new AuthGuard();
    const req = {
      get: jest
        .fn<string | undefined, [string]>()
        .mockReturnValue('Bearer abc'),
    };
    mockedAxios.get.mockResolvedValue({ status: 401, data: {} });

    await expect(
      guard.authenticateRequest(req as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
