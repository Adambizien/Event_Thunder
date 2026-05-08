import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { CategoriesController } from '../src/categories/categories.controller';
import { CategoriesService } from '../src/categories/categories.service';
import { EventsController } from '../src/events/events.controller';
import { EventsService } from '../src/events/events.service';

describe('Event service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const eventsService = {
    getAll: jest.fn(),
    getPublicList: jest.fn(),
    getOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const categoriesService = {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, CategoriesController, EventsController],
      providers: [
        { provide: AppService, useValue: { getHello: () => 'Hello World!' } },
        { provide: EventsService, useValue: eventsService },
        { provide: CategoriesService, useValue: categoriesService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the public event catalog', async () => {
    eventsService.getPublicList.mockResolvedValue([
      { id: 'event-1', title: 'Event Thunder Conf' },
    ]);

    await request(httpServer)
      .get('/api/events/public')
      .expect(200)
      .expect([{ id: 'event-1', title: 'Event Thunder Conf' }]);

    expect(eventsService.getPublicList).toHaveBeenCalledTimes(1);
  });

  it('creates an event from the API payload', async () => {
    const payload = { title: 'Launch party', creator_id: 'user-1' };
    eventsService.create.mockResolvedValue({ id: 'event-2', ...payload });

    await request(httpServer)
      .post('/api/events')
      .send(payload)
      .expect(201)
      .expect({ id: 'event-2', ...payload });

    expect(eventsService.create).toHaveBeenCalledWith(payload);
  });

  it('returns event categories', async () => {
    categoriesService.getAll.mockResolvedValue([
      { id: 'cat-1', name: 'Music' },
    ]);

    await request(httpServer)
      .get('/api/events/categories')
      .expect(200)
      .expect([{ id: 'cat-1', name: 'Music' }]);
  });
});
