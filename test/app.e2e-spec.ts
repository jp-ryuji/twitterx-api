import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import * as request from 'supertest';

import { configureApp } from './../src/app.factory';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as the main application
    configureApp(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/v1/ (GET)', () => {
    return request
      .default(app.getHttpServer())
      .get('/v1/')
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
