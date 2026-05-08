import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';

type CommentRecord = {
  id: string;
  user_id: string;
  event_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  comment_likes: Array<{ user_id: string }>;
};

type CommentLikeRecord = {
  id: string;
  user_id: string;
  comment_id: string;
};

type PrismaMock = {
  comment: {
    findMany: jest.Mock<Promise<CommentRecord[]>, [Record<string, unknown>]>;
    count: jest.Mock<Promise<number>, [Record<string, unknown>]>;
    create: jest.Mock<Promise<CommentRecord>, [Record<string, unknown>]>;
    findUnique: jest.Mock<
      Promise<{ id: string } | null>,
      [Record<string, unknown>]
    >;
    delete: jest.Mock<Promise<{ id: string }>, [Record<string, unknown>]>;
  };
  commentLike: {
    findFirst: jest.Mock<
      Promise<CommentLikeRecord | null>,
      [Record<string, unknown>]
    >;
    create: jest.Mock<Promise<CommentLikeRecord>, [Record<string, unknown>]>;
    delete: jest.Mock<Promise<CommentLikeRecord>, [Record<string, unknown>]>;
    count: jest.Mock<Promise<number>, [Record<string, unknown>]>;
    findMany: jest.Mock<
      Promise<Array<{ user_id: string }>>,
      [Record<string, unknown>]
    >;
  };
};

type FetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

type ProfanityFilterMock = {
  addWords: (...words: string[]) => void;
  clean: (input: string) => string;
};

type ServiceInternals = {
  profanityFilterPromise: Promise<ProfanityFilterMock> | null;
};

const mockProfanityFilter = (): ProfanityFilterMock => ({
  addWords: () => undefined,
  clean: (input: string) => input.replace(/badword/gi, '*******'),
});

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createPrismaMock = (): PrismaMock => ({
  comment: {
    findMany: createMock<Promise<CommentRecord[]>, [Record<string, unknown>]>(),
    count: createMock<Promise<number>, [Record<string, unknown>]>(),
    create: createMock<Promise<CommentRecord>, [Record<string, unknown>]>(),
    findUnique: createMock<
      Promise<{ id: string } | null>,
      [Record<string, unknown>]
    >(),
    delete: createMock<Promise<{ id: string }>, [Record<string, unknown>]>(),
  },
  commentLike: {
    findFirst: createMock<
      Promise<CommentLikeRecord | null>,
      [Record<string, unknown>]
    >(),
    create: createMock<Promise<CommentLikeRecord>, [Record<string, unknown>]>(),
    delete: createMock<Promise<CommentLikeRecord>, [Record<string, unknown>]>(),
    count: createMock<Promise<number>, [Record<string, unknown>]>(),
    findMany: createMock<
      Promise<Array<{ user_id: string }>>,
      [Record<string, unknown>]
    >(),
  },
});

const makeComment = (
  overrides: Partial<CommentRecord> = {},
): CommentRecord => ({
  id: 'comment-1',
  user_id: 'user-1',
  event_id: 'event-1',
  content: 'Hello',
  created_at: new Date('2026-01-01T10:00:00.000Z'),
  updated_at: new Date('2026-01-01T10:00:00.000Z'),
  comment_likes: [],
  ...overrides,
});

describe('CommentsService', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let fetchMock: jest.Mock<Promise<FetchResponse>, [string, RequestInit]>;
  let prisma: PrismaMock;
  let service: CommentsService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.USER_SERVICE_URL = 'http://user.test';
    fetchMock = jest.fn<Promise<FetchResponse>, [string, RequestInit]>();
    global.fetch = fetchMock as unknown as typeof fetch;
    prisma = createPrismaMock();
    service = new CommentsService(prisma as unknown as PrismaService);

    (service as unknown as ServiceInternals).profanityFilterPromise =
      Promise.resolve(mockProfanityFilter());
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('retourne les commentaires dun event avec auteur, likes et current user', async () => {
    const comment = makeComment({
      comment_likes: [{ user_id: 'user-2' }, { user_id: 'user-3' }],
    });
    prisma.comment.findMany.mockResolvedValue([comment]);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 'user-2', firstName: 'Grace', lastName: 'Hopper' },
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

    await expect(service.getByEvent('event-1', 'user-2')).resolves.toEqual([
      expect.objectContaining({
        id: 'comment-1',
        userId: 'user-1',
        authorDisplayName: 'Ada Lovelace',
        likeCount: 2,
        likedByCurrentUser: true,
        likedUserIds: ['user-2', 'user-3'],
        likedUsers: [
          expect.objectContaining({
            id: 'user-2',
            displayName: 'Grace Hopper',
          }),
          expect.objectContaining({
            id: 'user-3',
            displayName: 'Utilisateur user-3',
          }),
        ],
      }),
    ]);

    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: { event_id: 'event-1' },
      include: {
        comment_likes: {
          select: {
            user_id: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  });

  it('compte les commentaires dun event', async () => {
    prisma.comment.count.mockResolvedValue(3);

    await expect(service.getCountByEvent('event-1')).resolves.toEqual({
      count: 3,
    });

    expect(prisma.comment.count).toHaveBeenCalledWith({
      where: { event_id: 'event-1' },
    });
  });

  it('cree un commentaire non vide et censure son contenu', async () => {
    prisma.comment.create.mockResolvedValue(
      makeComment({
        content: 'hello *******',
      }),
    );
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' },
        }),
    });

    await expect(
      service.create('event-1', 'user-1', '  hello badword  '),
    ).resolves.toEqual(
      expect.objectContaining({
        content: 'hello *******',
        authorDisplayName: 'Ada Lovelace',
        likedByCurrentUser: false,
      }),
    );

    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        event_id: 'event-1',
        user_id: 'user-1',
        content: 'hello *******',
      },
      include: {
        comment_likes: {
          select: {
            user_id: true,
          },
        },
      },
    });
  });

  it('refuse de creer un commentaire vide', async () => {
    await expect(
      service.create('event-1', 'user-1', '   '),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it('ajoute un like puis retourne le compteur et les utilisateurs', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 'comment-1' });
    prisma.commentLike.findFirst.mockResolvedValue(null);
    prisma.commentLike.create.mockResolvedValue({
      id: 'like-1',
      comment_id: 'comment-1',
      user_id: 'user-2',
    });
    prisma.commentLike.count.mockResolvedValue(1);
    prisma.commentLike.findMany.mockResolvedValue([{ user_id: 'user-2' }]);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-2', firstName: 'Grace', lastName: 'Hopper' },
        }),
    });

    await expect(service.toggleLike('comment-1', 'user-2')).resolves.toEqual({
      commentId: 'comment-1',
      likeCount: 1,
      likedByCurrentUser: true,
      likedUserIds: ['user-2'],
      likedUsers: [
        {
          id: 'user-2',
          firstName: 'Grace',
          lastName: 'Hopper',
          displayName: 'Grace Hopper',
        },
      ],
    });

    expect(prisma.commentLike.create).toHaveBeenCalledWith({
      data: {
        comment_id: 'comment-1',
        user_id: 'user-2',
      },
    });
    expect(prisma.commentLike.delete).not.toHaveBeenCalled();
  });

  it('retire un like existant', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 'comment-1' });
    prisma.commentLike.findFirst.mockResolvedValue({
      id: 'like-1',
      comment_id: 'comment-1',
      user_id: 'user-2',
    });
    prisma.commentLike.delete.mockResolvedValue({
      id: 'like-1',
      comment_id: 'comment-1',
      user_id: 'user-2',
    });
    prisma.commentLike.count.mockResolvedValue(0);
    prisma.commentLike.findMany.mockResolvedValue([]);

    await expect(service.toggleLike('comment-1', 'user-2')).resolves.toEqual({
      commentId: 'comment-1',
      likeCount: 0,
      likedByCurrentUser: false,
      likedUserIds: [],
      likedUsers: [],
    });

    expect(prisma.commentLike.delete).toHaveBeenCalledWith({
      where: { id: 'like-1' },
    });
    expect(prisma.commentLike.create).not.toHaveBeenCalled();
  });

  it('refuse de liker un commentaire introuvable', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(
      service.toggleLike('missing', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('supprime un commentaire existant', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 'comment-1' });
    prisma.comment.delete.mockResolvedValue({ id: 'comment-1' });

    await expect(service.deleteComment('comment-1')).resolves.toEqual({
      message: 'Commentaire supprimé avec succès',
    });

    expect(prisma.comment.delete).toHaveBeenCalledWith({
      where: { id: 'comment-1' },
    });
  });

  it('refuse de supprimer un commentaire introuvable', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(service.deleteComment('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
