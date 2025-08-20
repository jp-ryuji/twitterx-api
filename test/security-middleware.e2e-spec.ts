import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import * as request from 'supertest';

import { configureApp } from './../src/app.factory';
import { AppModule } from './../src/app.module';

describe('Security Middleware (e2e)', () => {
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
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Request Logging', () => {
    it('should log requests', async () => {
      // This test verifies that requests are being processed
      // In a real scenario, we would check log output
      await request.default(app.getHttpServer()).get('/v1/healthz').expect(200);
    });
  });
});
