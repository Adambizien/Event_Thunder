import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { CommentsController } from '../src/comments/comments.controller';
import { CommentsService } from '../src/comments/comments.service';

describe('Comment service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const commentsService = {
    getByEvent: jest.fn(),
    getCountByEvent: jest.fn(),
    create: jest.fn(),
    toggleLike: jest.fn(),
    deleteComment: jest.fn(),
  };
  const eventId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, CommentsController],
      providers: [
        { provide: AppService, useValue: { getHello: () => 'Hello World!' } },
        { provide: CommentsService, useValue: commentsService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns public comments for an event', async () => {
    commentsService.getByEvent.mockResolvedValue([
      { id: 'comment-1', content: 'Great event' },
    ]);

    await request(httpServer)
      .get(`/api/comments/events/${eventId}`)
      .expect(200)
      .expect([{ id: 'comment-1', content: 'Great event' }]);

    expect(commentsService.getByEvent).toHaveBeenCalledWith(eventId, undefined);
  });

  it('creates an authenticated comment with the user header', async () => {
    const payload = { content: 'Count me in' };
    commentsService.create.mockResolvedValue({
      id: 'comment-2',
      ...payload,
      userId: 'user-1',
    });

    await request(httpServer)
      .post(`/api/comments/events/${eventId}`)
      .set('x-user-id', 'user-1')
      .send(payload)
      .expect(201)
      .expect({ id: 'comment-2', content: 'Count me in', userId: 'user-1' });

    expect(commentsService.create).toHaveBeenCalledWith(
      eventId,
      'user-1',
      payload.content,
    );
  });
});
