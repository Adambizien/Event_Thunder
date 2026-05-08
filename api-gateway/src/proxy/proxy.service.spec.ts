import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { Request } from 'express';
import { ProxyService } from './proxy.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const createRequest = (
  overrides: Partial<
    Request & {
      rawBody?: Buffer;
    }
  >,
) =>
  ({
    method: 'GET',
    originalUrl: '/api/auth/verify',
    path: '/api/auth/verify',
    headers: {},
    query: {},
    body: undefined,
    ...overrides,
  }) as Request & { rawBody?: Buffer };

describe('ProxyService', () => {
  const originalEnv = { ...process.env };
  let service: ProxyService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    service = new ProxyService();
    mockedAxios.request.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('ok'),
      statusText: 'OK',
      config: {},
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('transfere vers le bon service avec methode, query, headers et body', async () => {
    process.env.AUTH_SERVICE_URL = 'http://auth.test';
    const req = createRequest({
      method: 'POST',
      originalUrl: '/api/auth/login?redirect=1',
      path: '/api/auth/login',
      headers: {
        host: 'gateway.local',
        authorization: 'Bearer token',
      },
      query: { redirect: '1' },
      body: { email: 'john@example.com' },
    });

    await expect(service.forward(req)).resolves.toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('ok'),
    });

    const [config] = mockedAxios.request.mock.calls[0] as [
      AxiosRequestConfig<unknown>,
    ];

    expect(config).toMatchObject({
      method: 'POST',
      url: 'http://auth.test/api/auth/login',
      params: { redirect: '1' },
      data: { email: 'john@example.com' },
      timeout: 10000,
      responseType: 'arraybuffer',
      maxRedirects: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    expect(typeof config.validateStatus).toBe('function');
    expect(config.headers).toEqual({
      host: undefined,
      authorization: 'Bearer token',
    });
  });

  it('utilise rawBody pour les webhooks et le timeout long du finalize plan change', async () => {
    const rawBody = Buffer.from('raw-stripe-payload');

    await service.forward(
      createRequest({
        method: 'POST',
        originalUrl: '/api/billing/stripe/webhook',
        path: '/api/billing/stripe/webhook',
        rawBody,
        body: { parsed: true },
      }),
    );

    expect(mockedAxios.request.mock.calls[0][0]).toMatchObject({
      url: 'http://billing-service:3000/api/billing/stripe/webhook',
      data: rawBody,
      timeout: 10000,
    });

    await service.forward(
      createRequest({
        method: 'POST',
        originalUrl: '/api/subscriptions/finalize-plan-change',
        path: '/api/subscriptions/finalize-plan-change',
      }),
    );

    expect(mockedAxios.request.mock.calls[1][0]).toMatchObject({
      url: 'http://subscription-service:3000/api/subscriptions/finalize-plan-change',
      timeout: 30000,
    });
  });

  it('refuse les chemins sans service cible', async () => {
    await expect(
      service.forward(
        createRequest({
          originalUrl: '/api/unknown',
          path: '/api/unknown',
        }),
      ),
    ).rejects.toThrow('Aucun service cible pour ce chemin');

    expect(mockedAxios.request.mock.calls).toHaveLength(0);
  });
});
