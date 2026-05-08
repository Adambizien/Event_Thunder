import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

type RequestMock = {
  get: jest.Mock<string | undefined, [string]>;
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
};

const createContext = (req: RequestMock): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let fetchMock: jest.Mock<
    Promise<{ ok: boolean; json: () => Promise<unknown> }>,
    [string, RequestInit]
  >;

  beforeEach(() => {
    process.env = { ...originalEnv, AUTH_SERVICE_URL: 'http://auth.test' };
    fetchMock = jest.fn<
      Promise<{ ok: boolean; json: () => Promise<unknown> }>,
      [string, RequestInit]
    >();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('refuse une requete sans Authorization', async () => {
    const req: RequestMock = {
      get: jest.fn<string | undefined, [string]>().mockReturnValue(undefined),
    };

    await expect(
      new AuthGuard().canActivate(createContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('attache le user valide renvoye par auth-service', async () => {
    const req: RequestMock = {
      get: jest
        .fn<string | undefined, [string]>()
        .mockReturnValue('Bearer token'),
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-1', email: 'john@example.com', role: 'User' },
        }),
    });

    await expect(new AuthGuard().canActivate(createContext(req))).resolves.toBe(
      true,
    );

    expect(fetchMock).toHaveBeenCalledWith('http://auth.test/api/auth/verify', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token',
      },
    });
    expect(req.user).toEqual({
      id: 'user-1',
      email: 'john@example.com',
      role: 'User',
    });
  });

  it('refuse une reponse auth-service invalide', async () => {
    const req: RequestMock = {
      get: jest
        .fn<string | undefined, [string]>()
        .mockReturnValue('Bearer token'),
    };
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    await expect(
      new AuthGuard().canActivate(createContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
