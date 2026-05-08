import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { PostsController } from '../src/posts/posts.controller';
import { PostsService } from '../src/posts/posts.service';

describe('Post service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const postsService = {
    listPublic: jest.fn(),
    listMine: jest.fn(),
    listAllForAdmin: jest.fn(),
    getOne: jest.fn(),
    create: jest.fn(),
    generateText: jest.fn(),
    updateMine: jest.fn(),
    confirmPublication: jest.fn(),
    publishManual: jest.fn(),
    cancelManual: jest.fn(),
    deleteMine: jest.fn(),
    triggerDuePostConfirmations: jest.fn(),
  };
  const postId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, PostsController],
      providers: [{ provide: PostsService, useValue: postsService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns public social posts', async () => {
    postsService.listPublic.mockResolvedValue([
      { id: postId, content: 'Public announcement' },
    ]);

    await request(httpServer)
      .get('/api/posts/public')
      .expect(200)
      .expect([{ id: postId, content: 'Public announcement' }]);
  });

  it('rejects private post listing without an authenticated user header', () => {
    return request(httpServer).get('/api/posts').expect(401);
  });

  it('creates a post for the authenticated user', async () => {
    const payload = { eventId: 'event-1', content: 'Scheduled post' };
    postsService.create.mockResolvedValue({
      id: postId,
      userId: 'user-1',
      ...payload,
    });

    await request(httpServer)
      .post('/api/posts')
      .set('x-user-id', 'user-1')
      .send(payload)
      .expect(201)
      .expect({ id: postId, userId: 'user-1', ...payload });

    expect(postsService.create).toHaveBeenCalledWith('user-1', payload);
  });
});
