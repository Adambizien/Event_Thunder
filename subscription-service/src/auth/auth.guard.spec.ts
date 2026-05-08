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

type FetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
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
  let fetchMock: jest.Mock<Promise<FetchResponse>, [string, RequestInit]>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.AUTH_SERVICE_URL = 'http://auth.test';
    fetchMock = jest.fn<Promise<FetchResponse>, [string, RequestInit]>();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('refuse une requete sans authorization', async () => {
    const req: RequestMock = {
      get: jest.fn<string | undefined, [string]>().mockReturnValue(undefined),
    };

    await expect(
      new AuthGuard().canActivate(createContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('attache le user renvoye par auth-service', async () => {
    const req: RequestMock = {
      get: jest.fn<string | undefined, [string]>().mockReturnValue('Bearer t'),
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-1', email: 'u@test.com', role: 'User' },
        }),
    });

    await expect(new AuthGuard().canActivate(createContext(req))).resolves.toBe(
      true,
    );

    expect(req.user).toEqual({
      id: 'user-1',
      email: 'u@test.com',
      role: 'User',
    });
  });
});
