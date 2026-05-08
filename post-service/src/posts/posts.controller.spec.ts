import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

type PostsServiceMock = {
  listPublic: jest.Mock<Promise<unknown[]>, []>;
  listMine: jest.Mock<Promise<unknown[]>, [string]>;
  listAllForAdmin: jest.Mock<Promise<unknown[]>, []>;
  getOne: jest.Mock<Promise<unknown>, [string, string?, string?]>;
  create: jest.Mock<Promise<unknown>, [string, Record<string, unknown>]>;
  generateText: jest.Mock<
    Promise<unknown>,
    [string, Record<string, unknown>, string?]
  >;
  updateMine: jest.Mock<
    Promise<unknown>,
    [string, string, Record<string, unknown>]
  >;
  confirmPublication: jest.Mock<Promise<unknown>, [string, string]>;
  publishManual: jest.Mock<Promise<unknown>, [string, string]>;
  cancelManual: jest.Mock<Promise<unknown>, [string, string]>;
  deleteMine: jest.Mock<Promise<unknown>, [string, string]>;
  triggerDuePostConfirmations: jest.Mock<Promise<unknown>, [string?]>;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createPostsServiceMock = (): PostsServiceMock => ({
  listPublic: createMock<Promise<unknown[]>, []>(),
  listMine: createMock<Promise<unknown[]>, [string]>(),
  listAllForAdmin: createMock<Promise<unknown[]>, []>(),
  getOne: createMock<Promise<unknown>, [string, string?, string?]>(),
  create: createMock<Promise<unknown>, [string, Record<string, unknown>]>(),
  generateText: createMock<
    Promise<unknown>,
    [string, Record<string, unknown>, string?]
  >(),
  updateMine: createMock<
    Promise<unknown>,
    [string, string, Record<string, unknown>]
  >(),
  confirmPublication: createMock<Promise<unknown>, [string, string]>(),
  publishManual: createMock<Promise<unknown>, [string, string]>(),
  cancelManual: createMock<Promise<unknown>, [string, string]>(),
  deleteMine: createMock<Promise<unknown>, [string, string]>(),
  triggerDuePostConfirmations: createMock<Promise<unknown>, [string?]>(),
});

describe('PostsController', () => {
  let postsService: PostsServiceMock;
  let controller: PostsController;

  beforeEach(() => {
    postsService = createPostsServiceMock();
    controller = new PostsController(postsService as unknown as PostsService);
  });

  it('expose les posts publics et les posts du user authentifie', async () => {
    postsService.listPublic.mockResolvedValue([{ id: 'post-public' }]);
    postsService.listMine.mockResolvedValue([{ id: 'post-mine' }]);

    await expect(controller.getPublic()).resolves.toEqual([
      { id: 'post-public' },
    ]);
    await expect(controller.getMine('user-1')).resolves.toEqual([
      { id: 'post-mine' },
    ]);

    expect(postsService.listPublic).toHaveBeenCalledTimes(1);
    expect(postsService.listMine).toHaveBeenCalledWith('user-1');
    expect(() => controller.getMine(undefined)).toThrow(UnauthorizedException);
  });

  it('reserve la liste admin au role Admin', async () => {
    postsService.listAllForAdmin.mockResolvedValue([{ id: 'post-1' }]);

    await expect(controller.getAllForAdmin('Admin')).resolves.toEqual([
      { id: 'post-1' },
    ]);

    expect(postsService.listAllForAdmin).toHaveBeenCalledTimes(1);
    expect(() => controller.getAllForAdmin('User')).toThrow(ForbiddenException);
  });

  it('transmet les headers user/role a getOne', async () => {
    postsService.getOne.mockResolvedValue({ id: 'post-1' });

    await expect(
      controller.getOne('post-1', 'user-1', 'Admin'),
    ).resolves.toEqual({ id: 'post-1' });

    expect(postsService.getOne).toHaveBeenCalledWith(
      'post-1',
      'user-1',
      'Admin',
    );
  });

  it('exige un user pour creer, generer, modifier et supprimer', async () => {
    const createDto = {
      content: 'Annonce',
      networks: ['x'] as Array<'x' | 'facebook'>,
    };
    const generateDto = { prompt: 'Ecris un post' };
    const updateDto = { content: 'Updated' };
    postsService.create.mockResolvedValue({ id: 'post-1' });
    postsService.generateText.mockResolvedValue({ content: 'Generated' });
    postsService.updateMine.mockResolvedValue({ id: 'post-1' });
    postsService.deleteMine.mockResolvedValue({ message: 'Post supprimé' });

    await expect(controller.create(createDto, 'user-1')).resolves.toEqual({
      id: 'post-1',
    });
    await expect(
      controller.generateText(generateDto, 'user-1', 'User'),
    ).resolves.toEqual({ content: 'Generated' });
    await expect(
      controller.update('post-1', updateDto, 'user-1'),
    ).resolves.toEqual({ id: 'post-1' });
    await expect(controller.remove('post-1', 'user-1')).resolves.toEqual({
      message: 'Post supprimé',
    });

    expect(() => controller.create(createDto, undefined)).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      controller.generateText(generateDto, undefined, 'User'),
    ).toThrow(UnauthorizedException);
    expect(() => controller.update('post-1', updateDto, undefined)).toThrow(
      UnauthorizedException,
    );
    expect(() => controller.remove('post-1', undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('delegue les actions publiques de confirmation manuelle', async () => {
    postsService.confirmPublication.mockResolvedValue({ message: 'ok' });
    postsService.publishManual.mockResolvedValue({ message: 'published' });
    postsService.cancelManual.mockResolvedValue({ message: 'cancelled' });

    await expect(
      controller.confirm('post-1', {
        token: 'token-12345678901234567890123456789012',
      }),
    ).resolves.toEqual({ message: 'ok' });
    await expect(
      controller.publishManual('post-1', {
        token: 'token-12345678901234567890123456789012',
      }),
    ).resolves.toEqual({ message: 'published' });
    await expect(
      controller.cancelManual('post-1', {
        token: 'token-12345678901234567890123456789012',
      }),
    ).resolves.toEqual({ message: 'cancelled' });

    expect(postsService.confirmPublication).toHaveBeenCalledWith(
      'post-1',
      'token-12345678901234567890123456789012',
    );
    expect(postsService.publishManual).toHaveBeenCalledWith(
      'post-1',
      'token-12345678901234567890123456789012',
    );
    expect(postsService.cancelManual).toHaveBeenCalledWith(
      'post-1',
      'token-12345678901234567890123456789012',
    );
  });

  it('delegue le dispatch interne avec le secret cron', async () => {
    postsService.triggerDuePostConfirmations.mockResolvedValue({
      scanned: 1,
      confirmationsSent: 1,
    });

    await expect(controller.dispatchDue('cron-secret')).resolves.toEqual({
      scanned: 1,
      confirmationsSent: 1,
    });

    expect(postsService.triggerDuePostConfirmations).toHaveBeenCalledWith(
      'cron-secret',
    );
  });
});
