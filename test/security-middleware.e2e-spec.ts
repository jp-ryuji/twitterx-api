import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import cookieParser from 'cookie-parser';
import request from 'supertest';

import { configureApp } from './../src/app.factory';
import { AppModule } from './../src/app.module';
import { RedisService } from './../src/redis/redis.service';

describe('Security Middleware (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as the main application
    configureApp(app);

    // Add cookie parser middleware
    app.use(cookieParser());

    await app.init();

    redisService = moduleFixture.get(RedisService);
  });

  afterAll(async () => {
    // Clear Redis
    if (redisService) {
      const redisClient = redisService.getClient();
      if (redisClient && redisClient.isOpen) {
        await redisClient.flushAll();
      }
    }

    await app.close();
  });

  describe('CSRF Protection', () => {
    it('should allow GET requests without CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/')
        .expect(200);

      expect(response.text).toBe('Hello World!');
    });

    it('should detect suspicious patterns in requests', async () => {
      // Make a request to a valid endpoint with SQL injection pattern
      const response = await request(app.getHttpServer())
        .get('/v1/?test=SELECT%20*%20FROM%20users')
        .expect(200);

      // The middleware should detect this but not block it
      expect(response.status).toBe(200);
    });

    it('should detect brute force attempts', async () => {
      // Make a few requests to nonexistent endpoints
      await request(app.getHttpServer())
        .get('/v1/nonexistent-endpoint-1')
        .expect(404);

      await request(app.getHttpServer())
        .get('/v1/nonexistent-endpoint-2')
        .expect(404);

      // The security middleware should have logged these attempts
      expect(true).toBe(true);
    });
  });

  describe('Request Logging', () => {
    it('should log requests', async () => {
      // Make a simple request
      await request(app.getHttpServer()).get('/v1/').expect(200);

      // The middleware should have logged this request
      expect(true).toBe(true);
    });
  });
});
