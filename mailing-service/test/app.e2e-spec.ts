import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';

describe('Mailing service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('exposes a health endpoint for the gateway and CI probes', () => {
    return request(httpServer)
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', message: 'Mailing service is running' });
  });
});
