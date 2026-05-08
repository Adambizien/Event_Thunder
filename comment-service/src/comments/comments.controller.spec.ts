import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

type CommentsServiceMock = {
  getByEvent: jest.Mock<Promise<unknown[]>, [string, string?]>;
  getCountByEvent: jest.Mock<Promise<{ count: number }>, [string]>;
  create: jest.Mock<Promise<unknown>, [string, string, string]>;
  toggleLike: jest.Mock<Promise<unknown>, [string, string]>;
  deleteComment: jest.Mock<Promise<{ message: string }>, [string]>;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createCommentsServiceMock = (): CommentsServiceMock => ({
  getByEvent: createMock<Promise<unknown[]>, [string, string?]>(),
  getCountByEvent: createMock<Promise<{ count: number }>, [string]>(),
  create: createMock<Promise<unknown>, [string, string, string]>(),
  toggleLike: createMock<Promise<unknown>, [string, string]>(),
  deleteComment: createMock<Promise<{ message: string }>, [string]>(),
});

describe('CommentsController', () => {
  let commentsService: CommentsServiceMock;
  let controller: CommentsController;

  beforeEach(() => {
    commentsService = createCommentsServiceMock();
    controller = new CommentsController(
      commentsService as unknown as CommentsService,
    );
  });

  it('liste les commentaires dun event avec le user courant optionnel', async () => {
    commentsService.getByEvent.mockResolvedValue([
      { id: 'comment-1', content: 'hello' },
    ]);

    await expect(controller.getByEvent('event-1', 'user-1')).resolves.toEqual([
      { id: 'comment-1', content: 'hello' },
    ]);

    expect(commentsService.getByEvent).toHaveBeenCalledWith(
      'event-1',
      'user-1',
    );
  });

  it('retourne le compteur de commentaires dun event', async () => {
    commentsService.getCountByEvent.mockResolvedValue({ count: 4 });

    await expect(controller.getCountByEvent('event-1')).resolves.toEqual({
      count: 4,
    });

    expect(commentsService.getCountByEvent).toHaveBeenCalledWith('event-1');
  });

  it('cree un commentaire seulement si le user est authentifie', async () => {
    commentsService.create.mockResolvedValue({
      id: 'comment-1',
      content: 'hello',
    });

    await expect(
      controller.create('event-1', { content: 'hello' }, 'user-1'),
    ).resolves.toEqual({
      id: 'comment-1',
      content: 'hello',
    });

    expect(commentsService.create).toHaveBeenCalledWith(
      'event-1',
      'user-1',
      'hello',
    );

    expect(() =>
      controller.create('event-1', { content: 'hello' }, undefined),
    ).toThrow(UnauthorizedException);
  });

  it('toggle un like seulement si le user est authentifie', async () => {
    commentsService.toggleLike.mockResolvedValue({
      commentId: 'comment-1',
      likedByCurrentUser: true,
    });

    await expect(controller.toggleLike('comment-1', 'user-1')).resolves.toEqual(
      {
        commentId: 'comment-1',
        likedByCurrentUser: true,
      },
    );

    expect(commentsService.toggleLike).toHaveBeenCalledWith(
      'comment-1',
      'user-1',
    );

    expect(() => controller.toggleLike('comment-1', undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('supprime un commentaire seulement pour un admin', async () => {
    commentsService.deleteComment.mockResolvedValue({
      message: 'Commentaire supprimé avec succès',
    });

    await expect(
      controller.deleteComment('comment-1', 'Admin'),
    ).resolves.toEqual({
      message: 'Commentaire supprimé avec succès',
    });

    expect(commentsService.deleteComment).toHaveBeenCalledWith('comment-1');

    expect(() => controller.deleteComment('comment-1', 'User')).toThrow(
      ForbiddenException,
    );
  });
});
