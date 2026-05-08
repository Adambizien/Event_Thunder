import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { readSecret } from '../utils/secret.util';

jest.mock('../utils/secret.util', () => ({
  readSecret: jest.fn(),
}));

type Network = 'x' | 'facebook';
type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'awaiting_confirmation'
  | 'expired'
  | 'published'
  | 'archived';

type TargetRecord = {
  id?: string;
  network: Network;
  status?: string;
};

type PostRecord = {
  id: string;
  user_id: string;
  event_id?: string | null;
  content: string;
  status: PostStatus;
  scheduled_at: Date | null;
  published_at?: Date | null;
  created_at?: Date;
  targets: TargetRecord[];
  reminders?: Array<Record<string, unknown>>;
};

type TokenRecord = {
  id: string;
  post_id: string;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  post: PostRecord;
};

type TransactionClient = {
  postTarget: {
    deleteMany: jest.Mock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >;
  };
  post: {
    update: jest.Mock<Promise<PostRecord>, [Record<string, unknown>]>;
  };
};

type PrismaMock = {
  post: {
    create: jest.Mock<Promise<PostRecord>, [Record<string, unknown>]>;
    findMany: jest.Mock<Promise<PostRecord[]>, [Record<string, unknown>]>;
    findUnique: jest.Mock<
      Promise<PostRecord | null>,
      [Record<string, unknown>]
    >;
    update: jest.Mock<Promise<PostRecord>, [Record<string, unknown>]>;
    delete: jest.Mock<Promise<PostRecord>, [Record<string, unknown>]>;
  };
  postTarget: {
    updateMany: jest.Mock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >;
    deleteMany: jest.Mock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >;
  };
  postReminder: {
    findFirst: jest.Mock<
      Promise<Record<string, unknown> | null>,
      [Record<string, unknown>]
    >;
    create: jest.Mock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >;
  };
  postConfirmationToken: {
    create: jest.Mock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >;
    findFirst: jest.Mock<
      Promise<TokenRecord | null>,
      [Record<string, unknown>]
    >;
    update: jest.Mock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >;
  };
  $transaction: jest.Mock<
    Promise<PostRecord>,
    [(tx: TransactionClient) => Promise<PostRecord>]
  >;
};

type FetchResponse = {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const makePost = (overrides: Partial<PostRecord> = {}): PostRecord => ({
  id: 'post-1',
  user_id: 'user-1',
  event_id: 'event-1',
  content: 'Hello world',
  status: 'draft',
  scheduled_at: null,
  published_at: null,
  created_at: new Date('2026-01-01T10:00:00.000Z'),
  targets: [{ network: 'x', status: 'pending' }],
  reminders: [],
  ...overrides,
});

const createPrismaMock = (): PrismaMock => ({
  post: {
    create: createMock<Promise<PostRecord>, [Record<string, unknown>]>(),
    findMany: createMock<Promise<PostRecord[]>, [Record<string, unknown>]>(),
    findUnique: createMock<
      Promise<PostRecord | null>,
      [Record<string, unknown>]
    >(),
    update: createMock<Promise<PostRecord>, [Record<string, unknown>]>(),
    delete: createMock<Promise<PostRecord>, [Record<string, unknown>]>(),
  },
  postTarget: {
    updateMany: createMock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >(),
    deleteMany: createMock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >(),
  },
  postReminder: {
    findFirst: createMock<
      Promise<Record<string, unknown> | null>,
      [Record<string, unknown>]
    >(),
    create: createMock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >(),
  },
  postConfirmationToken: {
    create: createMock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >(),
    findFirst: createMock<
      Promise<TokenRecord | null>,
      [Record<string, unknown>]
    >(),
    update: createMock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >(),
  },
  $transaction: createMock<
    Promise<PostRecord>,
    [(tx: TransactionClient) => Promise<PostRecord>]
  >(),
});

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

describe('PostsService', () => {
  const readSecretMock = readSecret as jest.MockedFunction<typeof readSecret>;
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock<Promise<FetchResponse>, [string, RequestInit?]>;
  let publishWithRetry: jest.Mock<
    Promise<void>,
    [string, Record<string, unknown>]
  >;
  let prisma: PrismaMock;
  let service: PostsService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.FRONTEND_URL = 'https://app.test';
    process.env.USER_SERVICE_URL = 'http://user.test';
    process.env.EVENT_SERVICE_URL = 'http://event.test';
    process.env.AI_API_URL = 'http://ai.test/chat';
    readSecretMock.mockImplementation((name) => {
      if (name === 'POST_CRON_SECRET') return 'cron-secret';
      if (name === 'AI_API_KEY') return 'ai-secret';
      return undefined;
    });
    fetchMock = jest.fn<Promise<FetchResponse>, [string, RequestInit?]>();
    global.fetch = fetchMock as unknown as typeof fetch;
    publishWithRetry = jest
      .fn<Promise<void>, [string, Record<string, unknown>]>()
      .mockResolvedValue(undefined);
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation((callback) =>
      callback({
        postTarget: {
          deleteMany: prisma.postTarget.deleteMany,
        },
        post: {
          update: prisma.post.update,
        },
      }),
    );
    service = new PostsService(
      prisma as unknown as PrismaService,
      { publishWithRetry } as unknown as RabbitmqPublisherService,
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('cree un brouillon avec lien evenement et cible reseau', async () => {
    const created = makePost({
      content: 'Annonce\n\nhttps://app.test/events/event-1',
    });
    prisma.post.create.mockResolvedValue(created);

    await expect(
      service.create('user-1', {
        event_id: 'event-1',
        content: 'Annonce',
        networks: ['x'],
      }),
    ).resolves.toBe(created);

    expect(prisma.post.create).toHaveBeenCalledWith({
      data: {
        user_id: 'user-1',
        event_id: 'event-1',
        content: 'Annonce\n\nhttps://app.test/events/event-1',
        status: 'draft',
        scheduled_at: undefined,
        targets: {
          create: [{ network: 'x', status: 'pending' }],
        },
      },
      include: { targets: true },
    });
  });

  it('refuse une date planifiee invalide ou pas future', async () => {
    await expect(
      service.create('user-1', {
        content: 'Annonce',
        scheduled_at: 'bad-date',
        networks: ['x'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create('user-1', {
        content: 'Annonce',
        scheduled_at: '2020-01-01T10:00:00.000Z',
        networks: ['x'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('protege un post non publie des non proprietaires', async () => {
    prisma.post.findUnique.mockResolvedValue(
      makePost({ status: 'scheduled', user_id: 'owner-1' }),
    );

    await expect(
      service.getOne('post-1', 'user-2', 'User'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(service.getOne('post-1', 'owner-1', 'User')).resolves.toEqual(
      expect.objectContaining({ id: 'post-1' }),
    );
  });

  it('liste tous les posts admin avec proprietaires enrichis', async () => {
    prisma.post.findMany.mockResolvedValue([
      makePost({ user_id: 'user-1' }),
      makePost({ id: 'post-2', user_id: 'user-2' }),
    ]);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 'user-1', email: 'ada@test.com', firstName: 'Ada' },
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

    await expect(service.listAllForAdmin()).resolves.toEqual([
      expect.objectContaining({
        id: 'post-1',
        owner: { id: 'user-1', email: 'ada@test.com', firstName: 'Ada' },
      }),
      expect.objectContaining({
        id: 'post-2',
        owner: null,
      }),
    ]);
  });

  it('met a jour un post proprietaire avec transaction et remplace les targets', async () => {
    prisma.post.findUnique.mockResolvedValue(
      makePost({
        user_id: 'user-1',
        content: 'Old',
        event_id: null,
        scheduled_at: null,
        status: 'draft',
      }),
    );
    const updated = makePost({
      content: 'New\n\nhttps://app.test/events/event-2',
      event_id: 'event-2',
      scheduled_at: new Date('2099-01-01T10:00:00.000Z'),
      status: 'scheduled',
      targets: [{ network: 'facebook', status: 'pending' }],
    });
    prisma.post.update.mockResolvedValue(updated);

    await expect(
      service.updateMine('post-1', 'user-1', {
        content: 'New',
        event_id: 'event-2',
        scheduled_at: '2099-01-01T10:00:00.000Z',
        networks: ['facebook'],
      }),
    ).resolves.toBe(updated);

    expect(prisma.postTarget.deleteMany).toHaveBeenCalledWith({
      where: { post_id: 'post-1' },
    });
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: {
        content: 'New\n\nhttps://app.test/events/event-2',
        event_id: 'event-2',
        scheduled_at: new Date('2099-01-01T10:00:00.000Z'),
        status: 'scheduled',
        published_at: null,
        targets: {
          create: [{ network: 'facebook', status: 'pending' }],
        },
      },
      include: { targets: true },
    });
  });

  it('refuse modification sans ownership ou sur post verrouille', async () => {
    prisma.post.findUnique.mockResolvedValue(
      makePost({ user_id: 'owner-1', status: 'draft' }),
    );

    await expect(
      service.updateMine('post-1', 'user-2', { content: 'New' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.post.findUnique.mockResolvedValue(
      makePost({ user_id: 'user-1', status: 'published' }),
    );

    await expect(
      service.updateMine('post-1', 'user-1', { content: 'New' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supprime seulement un post non publie appartenant au user', async () => {
    prisma.post.findUnique.mockResolvedValue(
      makePost({ user_id: 'user-1', status: 'scheduled' }),
    );
    prisma.post.delete.mockResolvedValue(makePost());

    await expect(service.deleteMine('post-1', 'user-1')).resolves.toEqual({
      message: 'Post supprimé',
    });

    expect(prisma.post.delete).toHaveBeenCalledWith({
      where: { id: 'post-1' },
    });

    prisma.post.findUnique.mockResolvedValue(
      makePost({ user_id: 'user-1', status: 'published' }),
    );

    await expect(service.deleteMine('post-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('declenche les confirmations dues avec secret cron valide', async () => {
    prisma.post.findMany.mockResolvedValue([
      makePost({
        id: 'post-1',
        user_id: 'user-1',
        status: 'scheduled',
        scheduled_at: new Date('2026-01-01T10:00:00.000Z'),
        targets: [{ network: 'facebook' }],
      }),
    ]);
    prisma.postReminder.findFirst.mockResolvedValue(null);
    prisma.postConfirmationToken.create.mockResolvedValue({});
    prisma.postReminder.create.mockResolvedValue({});
    prisma.post.update.mockResolvedValue(makePost());
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: {
            id: 'user-1',
            email: 'ada@test.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
          },
        }),
    });

    const result = await service.triggerDuePostConfirmations('cron-secret');

    expect(result.scanned).toBe(1);
    expect(result.confirmationsSent).toBe(1);
    expect(publishWithRetry).toHaveBeenCalledWith(
      'post.mail.confirmation.requested',
      expect.objectContaining({
        email: 'ada@test.com',
        username: 'Ada Lovelace',
        postId: 'post-1',
        networks: ['facebook'],
        contentPreview: 'Hello world',
      }),
    );
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: { status: 'awaiting_confirmation' },
    });
  });

  it('refuse le dispatch interne avec secret invalide', async () => {
    await expect(
      service.triggerDuePostConfirmations('bad-secret'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('confirme un token valide et construit une intention facebook prioritaire', async () => {
    const token = 'valid-token';
    const post = makePost({
      content: 'Annonce',
      event_id: 'event-1',
      targets: [{ network: 'x' }, { network: 'facebook' }],
    });
    prisma.postConfirmationToken.findFirst.mockResolvedValue({
      id: 'token-1',
      post_id: 'post-1',
      token_hash: hashToken(token),
      expires_at: new Date('2099-01-01T10:00:00.000Z'),
      consumed_at: null,
      post,
    });

    const result = await service.confirmPublication('post-1', token);

    expect(result.intentNetwork).toBe('facebook');
    expect(result.intentUrl).toContain('https://www.facebook.com/sharer');
    expect(result.intentUrl).toContain(
      'https%3A%2F%2Fapp.test%2Fevents%2Fevent-1',
    );
  });

  it('annule automatiquement un token expire', async () => {
    const token = 'expired-token';
    prisma.postConfirmationToken.findFirst.mockResolvedValue({
      id: 'token-1',
      post_id: 'post-1',
      token_hash: hashToken(token),
      expires_at: new Date('2020-01-01T10:00:00.000Z'),
      consumed_at: null,
      post: makePost({ status: 'awaiting_confirmation' }),
    });
    prisma.postConfirmationToken.update.mockResolvedValue({});
    prisma.post.update.mockResolvedValue(makePost());
    prisma.postTarget.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.confirmPublication('post-1', token),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: {
        status: 'expired',
        published_at: null,
      },
    });
    expect(prisma.postTarget.updateMany).toHaveBeenCalledWith({
      where: { post_id: 'post-1' },
      data: {
        status: 'cancelled',
        published_at: null,
        external_post_id: null,
        error_message: 'Annulé automatiquement: token de confirmation expiré',
      },
    });
  });

  it('publie manuellement un post et consomme le token', async () => {
    const token = 'publish-token';
    prisma.postConfirmationToken.findFirst.mockResolvedValue({
      id: 'token-1',
      post_id: 'post-1',
      token_hash: hashToken(token),
      expires_at: new Date('2099-01-01T10:00:00.000Z'),
      consumed_at: null,
      post: makePost({ targets: [{ network: 'x' }] }),
    });
    prisma.postConfirmationToken.update.mockResolvedValue({});
    prisma.post.update.mockResolvedValue(makePost({ status: 'published' }));
    prisma.postTarget.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.publishManual('post-1', token);

    expect(result.intentNetwork).toBe('x');
    expect(result.intentUrl).toContain('https://twitter.com/intent/tweet');
    const [tokenUpdateCall] = prisma.postConfirmationToken.update.mock.calls;
    const consumedAt = (tokenUpdateCall[0].data as { consumed_at?: unknown })
      .consumed_at;
    const [targetUpdateCall] = prisma.postTarget.updateMany.mock.calls;
    const publishedAt = (targetUpdateCall[0].data as { published_at?: unknown })
      .published_at;

    expect(tokenUpdateCall[0].where).toEqual({ id: 'token-1' });
    expect(consumedAt).toBeInstanceOf(Date);
    expect(targetUpdateCall[0]).toMatchObject({
      where: { post_id: 'post-1' },
      data: {
        status: 'published',
        external_post_id: 'manual_x_publish',
        error_message: null,
      },
    });
    expect(publishedAt).toBeInstanceOf(Date);
  });

  it('genere du texte IA avec contexte evenement et applique le quota', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'event-1',
            title: 'Tech Summit',
            category: { name: 'Tech' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              choices: [{ message: { content: 'Post généré' } }],
            }),
          ),
      });

    const result = await service.generateText(
      'user-1',
      { prompt: 'Annonce mon event', event_id: 'event-1' },
      'User',
    );

    expect(result).toMatchObject({
      content: 'Post généré',
      remainingGenerations: 4,
      limit: 5,
    });
    expect(typeof result.availableAt).toBe('string');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://event.test/api/events/event-1',
    );
    expect(fetchMock.mock.calls[1][0]).toBe('http://ai.test/chat');
  });
});
