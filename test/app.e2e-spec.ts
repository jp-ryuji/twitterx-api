import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request
      .default(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/v1/healthz (GET)', () => {
    return request
      .default(app.getHttpServer())
      .get('/v1/healthz')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('timestamp');
        expect(['ok', 'error']).toContain(res.body.status);
      });
  });
});
