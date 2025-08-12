import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import * as request from 'supertest';

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable versioning to match main application configuration
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

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
