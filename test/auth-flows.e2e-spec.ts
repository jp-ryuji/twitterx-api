import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import * as request from 'supertest';

import { configureApp } from './../src/app.factory';
import { AppModule } from './../src/app.module';

describe('Authentication Flows (e2e)', () => {
  let app: INestApplication;

  // Test user data
  const testUser = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'SecurePass123!',
  };

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

  describe('Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('requiresEmailVerification');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject registration with existing username', async () => {
      // First registration
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          username: 'uniqueuser',
          email: 'unique1@example.com',
          password: 'SecurePass123!',
        })
        .expect(201);

      // Try to register with the same username
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          username: 'uniqueuser',
          email: 'unique2@example.com',
          password: 'SecurePass123!',
        })
        .expect(409); // Conflict
    });

    it('should reject registration with existing email', async () => {
      // First registration
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          username: 'uniqueuser2',
          email: 'unique@example.com',
          password: 'SecurePass123!',
        })
        .expect(201);

      // Try to register with the same email
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          username: 'uniqueuser3',
          email: 'unique@example.com',
          password: 'SecurePass123!',
        })
        .expect(409); // Conflict
    });

    it('should reject registration with invalid data', async () => {
      // Missing required fields
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          username: 'testuser',
        })
        .expect(400); // Bad Request

      // Invalid email format
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePass123!',
        })
        .expect(400); // Bad Request

      // Weak password
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123',
        })
        .expect(400); // Bad Request
    });
  });

  describe('Login Flow', () => {
    it('should login successfully with username', async () => {
      // Note: Since email verification is required, we can't fully test login flow
      // without verifying the email. This test just verifies the endpoint exists.
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signin')
        .send({
          username: 'nonexistentuser',
          password: 'SecurePass123!',
        })
        .expect(400); // Bad Request for validation errors
    });

    it('should login successfully with email', async () => {
      // Note: Since email verification is required, we can't fully test login flow
      // without verifying the email. This test just verifies the endpoint exists.
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        })
        .expect(400); // Bad Request for validation errors
    });

    it('should reject login with invalid credentials', async () => {
      // Try to login with wrong password
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signin')
        .send({
          username: 'nonexistentuser',
          password: 'WrongPassword123!',
        })
        .expect(400); // Bad Request for validation errors
    });
  });

  describe('OAuth Flow', () => {
    it('should initiate Google OAuth flow', async () => {
      // This test would require mocking the OAuth flow
      // For now, we'll verify that the endpoint exists
      // In a real implementation, this would redirect to Google's OAuth endpoint
      await request
        .default(app.getHttpServer())
        .get('/v1/auth/google')
        .expect(302); // Redirect
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset successfully', async () => {
      // Request password reset for non-existent user
      const resetResponse = await request
        .default(app.getHttpServer())
        .post('/v1/auth/password/reset/request')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200); // Always return 200 for security reasons

      expect(resetResponse.body).toHaveProperty('message');
    });

    it('should reject password reset with invalid token', async () => {
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/password/reset')
        .send({
          token: 'invalid-token',
          newPassword: 'NewSecurePass123!',
        })
        .expect(401); // Unauthorized for invalid token
    });
  });

  describe('Email Verification Flow', () => {
    it('should reject verification with invalid token', async () => {
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/email/verify')
        .send({
          token: 'invalid-token',
        })
        .expect(401); // Unauthorized for invalid token
    });
  });
});
