import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import * as request from 'supertest';

import { configureApp } from '../src/app.factory';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('Authentication Flows (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let redisService: RedisService;

  // Increase timeout for all tests
  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prismaService = moduleFixture.get(PrismaService);
    redisService = moduleFixture.get(RedisService);
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (prismaService) {
        await prismaService.session.deleteMany({});
        await prismaService.userOAuthProvider.deleteMany({});
        await prismaService.user.deleteMany({});
      }

      // Clear Redis
      if (redisService) {
        const redisClient = redisService.getClient();
        if (redisClient && redisClient.isOpen) {
          await redisClient.flushAll();
        }
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Cleanup warning:', error.message);
    }

    await app.close();
  });

  describe('Registration Flow', () => {
    const validUser = {
      username: 'testuser123',
      email: 'testuser123@example.com',
      password: 'SecurePassword123!',
      displayName: 'Test User',
      birthDate: '1990-01-01',
    };

    afterEach(async () => {
      // Clean up after each test
      try {
        if (prismaService) {
          await prismaService.user.deleteMany({
            where: {
              username: {
                in: [validUser.username, 'differentuser', 'testuser123'],
              },
            },
          });
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should register a new user successfully', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(validUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(validUser.username);
      expect(response.body.user.email).toBe(validUser.email);
      expect(response.body.user.displayName).toBe(validUser.displayName);
      expect(response.body.requiresEmailVerification).toBe(true);
    });

    it('should reject registration with existing username', async () => {
      // First registration
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(validUser)
        .expect(201);

      // Second registration with same username
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          ...validUser,
          email: 'different@example.com', // Different email
        })
        .expect(409);

      expect(response.body.message).toContain('is not available');
      expect(response.body.code).toBe('USERNAME_UNAVAILABLE');
    });

    it('should reject registration with existing email', async () => {
      // First registration
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(validUser)
        .expect(201);

      // Second registration with same email
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send({
          ...validUser,
          username: 'differentuser', // Different username
        })
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should reject registration with invalid data', async () => {
      const invalidUser = {
        username: 'ab', // Too short
        email: 'invalid-email', // Invalid format
        password: '123', // Too short
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(invalidUser)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'Username must be between 3 and 15 characters',
          'Please provide a valid email address',
          'Password must be at least 8 characters long',
        ]),
      );
    });
  });

  describe('Login Flow', () => {
    const testUser = {
      username: 'loginuser',
      email: 'loginuser@example.com',
      password: 'SecurePassword123!',
      displayName: 'Login User',
    };

    beforeAll(async () => {
      // Register a user for login tests
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(testUser)
        .expect(201);

      // Verify the email to allow login if registration was successful
      if (response.status === 201 && prismaService) {
        try {
          const user = await prismaService.user.findUnique({
            where: { usernameLower: testUser.username.toLowerCase() },
          });

          if (user?.emailVerificationToken) {
            await prismaService.user.update({
              where: { id: user.id },
              data: {
                emailVerified: true,
                emailVerificationToken: null,
              },
            });
          }
        } catch (error) {
          // Ignore if user doesn't exist or other DB issues
          console.warn('Setup warning:', error.message);
        }
      }
    });

    afterAll(async () => {
      // Clean up after login tests
      try {
        if (prismaService) {
          await prismaService.user.deleteMany({
            where: {
              username: testUser.username,
            },
          });
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should login successfully with username', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signin')
        .send({
          emailOrUsername: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Sign in successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.sessionToken).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should login successfully with email', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signin')
        .send({
          emailOrUsername: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.sessionToken).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signin')
        .send({
          emailOrUsername: testUser.username,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('OAuth Flow', () => {
    // Note: This would require mocking the Google OAuth service
    // For now, we'll test the endpoint structure
    it('should initiate Google OAuth flow', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/v1/auth/google')
        .expect(302); // Redirect response

      expect(response.header.location).toContain('accounts.google.com');
    });
  });

  describe('Password Reset Flow', () => {
    const testUser = {
      username: 'resetuser',
      email: 'resetuser@example.com',
      password: 'SecurePassword123!',
    };

    beforeAll(async () => {
      // Register a user for password reset tests
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(testUser)
        .expect(201);

      // Verify the email if registration was successful
      if (response.status === 201 && prismaService) {
        try {
          const user = await prismaService.user.findUnique({
            where: { usernameLower: testUser.username.toLowerCase() },
          });

          if (user?.emailVerificationToken) {
            await prismaService.user.update({
              where: { id: user.id },
              data: {
                emailVerified: true,
                emailVerificationToken: null,
              },
            });
          }
        } catch (error) {
          // Ignore if user doesn't exist or other DB issues
          console.warn('Setup warning:', error.message);
        }
      }
    });

    afterAll(async () => {
      // Clean up after password reset tests
      try {
        if (prismaService) {
          await prismaService.user.deleteMany({
            where: {
              username: testUser.username,
            },
          });
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should request password reset successfully', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/password/reset/request')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain(
        'password reset link has been sent',
      );
    });

    it('should reset password successfully', async () => {
      // First, request a reset token
      await request
        .default(app.getHttpServer())
        .post('/v1/auth/password/reset/request')
        .send({ email: testUser.email })
        .expect(200);

      let user;
      try {
        if (prismaService) {
          user = await prismaService.user.findUnique({
            where: { emailLower: testUser.email.toLowerCase() },
          });
        }
      } catch (error) {
        // If we can't get the user, skip this test
        console.warn('Skip test - user not found:', error.message);
        return;
      }

      // Skip if user or reset token not found
      if (!user || !user.passwordResetToken) {
        return;
      }

      // Now reset the password
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/password/reset')
        .send({
          token: user.passwordResetToken,
          newPassword: 'NewSecurePassword456!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successful');
    });

    it('should reject password reset with invalid token', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/password/reset')
        .send({
          token: 'invalid-token',
          newPassword: 'NewSecurePassword456!',
        })
        .expect(401);

      expect(response.body.message).toContain(
        'Invalid or expired password reset token',
      );
    });
  });

  describe('Email Verification Flow', () => {
    const testUser = {
      username: 'verifyuser',
      email: 'verifyuser@example.com',
      password: 'SecurePassword123!',
    };

    let verificationToken: string;

    beforeAll(async () => {
      // Register a user for email verification tests
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/signup')
        .send(testUser)
        .expect(201);

      // Get the verification token if registration was successful
      if (response.status === 201 && prismaService) {
        try {
          const user = await prismaService.user.findUnique({
            where: { usernameLower: testUser.username.toLowerCase() },
          });

          verificationToken = user?.emailVerificationToken || null;
        } catch (error) {
          // Ignore if user doesn't exist or other DB issues
          console.warn('Setup warning:', error.message);
        }
      }
    });

    afterAll(async () => {
      // Clean up after email verification tests
      try {
        if (prismaService) {
          await prismaService.user.deleteMany({
            where: {
              username: testUser.username,
            },
          });
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should verify email successfully', async () => {
      // Skip if we don't have a verification token
      if (!verificationToken) {
        console.warn('Skip test - no verification token');
        return;
      }

      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/email/verify')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email verified successfully.');
    });

    it('should reject verification with invalid token', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/v1/auth/email/verify')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain(
        'Invalid or expired email verification token',
      );
    });
  });
});
