import { HttpStatus } from '@nestjs/common';

import {
  AccountLockedException,
  AccountSuspendedException,
  AuthenticationException,
  DatabaseConnectionException,
  EmailAlreadyExistsException,
  EmailServiceException,
  EmailVerificationRequiredException,
  InsufficientPermissionsException,
  InvalidCredentialsException,
  InvalidPasswordException,
  InvalidTokenException,
  OAuthConfigurationException,
  OAuthInvalidStateException,
  OAuthProfileFetchException,
  OAuthProviderLinkException,
  OAuthTokenExchangeException,
  RateLimitExceededException,
  RedisConnectionException,
  SessionExpiredException,
  SessionNotFoundException,
  ShadowBannedException,
  SuspiciousActivityException,
  UserNotFoundException,
  UsernameUnavailableException,
} from './auth.exceptions';

describe('Authentication Exceptions', () => {
  describe('AuthenticationException', () => {
    it('should create exception with default status code', () => {
      const exception = new AuthenticationException('Test message');

      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.message).toBe('Test message');
    });

    it('should create exception with custom status code', () => {
      const exception = new AuthenticationException(
        'Test message',
        HttpStatus.FORBIDDEN,
      );

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.message).toBe('Test message');
    });
  });

  describe('UsernameUnavailableException', () => {
    it('should create exception with username and suggestions', () => {
      const suggestions = ['john_doe2', 'john_doe3'];
      const exception = new UsernameUnavailableException(
        'john_doe',
        suggestions,
      );

      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.getResponse()).toEqual({
        message: "Username 'john_doe' is not available",
        suggestions,
        code: 'USERNAME_UNAVAILABLE',
      });
    });

    it('should create exception without suggestions', () => {
      const exception = new UsernameUnavailableException('john_doe');

      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.getResponse()).toEqual({
        message: "Username 'john_doe' is not available",
        suggestions: [],
        code: 'USERNAME_UNAVAILABLE',
      });
    });
  });

  describe('EmailAlreadyExistsException', () => {
    it('should create exception with email', () => {
      const exception = new EmailAlreadyExistsException('test@example.com');

      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.getResponse()).toEqual({
        message: 'An account with this email (test@example.com) already exists',
        code: 'EMAIL_ALREADY_EXISTS',
        suggestion: 'Try signing in instead',
      });
    });
  });

  describe('InvalidPasswordException', () => {
    it('should create exception with validation errors', () => {
      const errors = [
        'Password must be at least 8 characters',
        'Password must contain a number',
      ];
      const exception = new InvalidPasswordException(errors);

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getResponse()).toEqual({
        message: 'Password does not meet security requirements',
        errors,
        code: 'INVALID_PASSWORD',
      });
    });
  });

  describe('InvalidCredentialsException', () => {
    it('should create exception with default message', () => {
      const exception = new InvalidCredentialsException();

      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.getResponse()).toEqual({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    });
  });

  describe('AccountLockedException', () => {
    it('should create exception with lockout information', () => {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const exception = new AccountLockedException(lockedUntil);

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      const response = exception.getResponse() as any;
      expect(response.message).toBe(
        'Account is temporarily locked due to too many failed login attempts',
      );
      expect(response.code).toBe('ACCOUNT_LOCKED');
      expect(response.lockedUntil).toBe(lockedUntil.toISOString());
      expect(response.lockoutDurationMinutes).toBeGreaterThan(0);
    });
  });

  describe('AccountSuspendedException', () => {
    it('should create exception with reason', () => {
      const exception = new AccountSuspendedException(
        'Violation of terms of service',
      );

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.getResponse()).toEqual({
        message: 'Account has been suspended',
        reason: 'Violation of terms of service',
        code: 'ACCOUNT_SUSPENDED',
      });
    });

    it('should create exception without reason', () => {
      const exception = new AccountSuspendedException();

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.getResponse()).toEqual({
        message: 'Account has been suspended',
        reason: undefined,
        code: 'ACCOUNT_SUSPENDED',
      });
    });
  });

  describe('RateLimitExceededException', () => {
    it('should create exception with retry after time', () => {
      const retryAfter = 300; // 5 minutes
      const exception = new RateLimitExceededException(retryAfter);

      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.getResponse()).toEqual({
        message: 'Rate limit exceeded',
        retryAfter,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    });
  });

  describe('OAuth Exceptions', () => {
    describe('OAuthConfigurationException', () => {
      it('should create exception with provider name', () => {
        const exception = new OAuthConfigurationException('google');

        expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(exception.getResponse()).toEqual({
          message: 'OAuth configuration for google is missing or invalid',
          code: 'OAUTH_CONFIGURATION_ERROR',
        });
      });
    });

    describe('OAuthTokenExchangeException', () => {
      it('should create exception with provider and error', () => {
        const exception = new OAuthTokenExchangeException(
          'google',
          'invalid_grant',
        );

        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
          message: 'Failed to exchange authorization code with google',
          error: 'invalid_grant',
          code: 'OAUTH_TOKEN_EXCHANGE_ERROR',
        });
      });

      it('should create exception without error details', () => {
        const exception = new OAuthTokenExchangeException('google');

        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
          message: 'Failed to exchange authorization code with google',
          error: undefined,
          code: 'OAUTH_TOKEN_EXCHANGE_ERROR',
        });
      });
    });

    describe('OAuthProfileFetchException', () => {
      it('should create exception with provider and error', () => {
        const exception = new OAuthProfileFetchException(
          'google',
          'access_denied',
        );

        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
          message: 'Failed to fetch user profile from google',
          error: 'access_denied',
          code: 'OAUTH_PROFILE_FETCH_ERROR',
        });
      });
    });

    describe('OAuthInvalidStateException', () => {
      it('should create exception with default message', () => {
        const exception = new OAuthInvalidStateException();

        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
          message: 'Invalid OAuth state parameter',
          code: 'OAUTH_INVALID_STATE',
        });
      });
    });

    describe('OAuthProviderLinkException', () => {
      it('should create exception with provider and email', () => {
        const exception = new OAuthProviderLinkException(
          'google',
          'test@example.com',
        );

        expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
        expect(exception.getResponse()).toEqual({
          message:
            'Cannot link google account. An account with email test@example.com already exists with different authentication method',
          code: 'OAUTH_PROVIDER_LINK_ERROR',
          suggestion: 'Try signing in with your existing credentials first',
        });
      });
    });
  });

  describe('Security Exceptions', () => {
    describe('SuspiciousActivityException', () => {
      it('should create exception with reason', () => {
        const exception = new SuspiciousActivityException(
          'Multiple failed login attempts from different locations',
        );

        expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(exception.getResponse()).toEqual({
          message: 'Suspicious activity detected',
          reason: 'Multiple failed login attempts from different locations',
          code: 'SUSPICIOUS_ACTIVITY',
        });
      });
    });

    describe('ShadowBannedException', () => {
      it('should create exception with default message', () => {
        const exception = new ShadowBannedException();

        expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(exception.getResponse()).toEqual({
          message: 'Account access restricted',
          code: 'SHADOW_BANNED',
        });
      });
    });

    describe('InsufficientPermissionsException', () => {
      it('should create exception with action', () => {
        const exception = new InsufficientPermissionsException('delete user');

        expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(exception.getResponse()).toEqual({
          message: 'Insufficient permissions to perform action: delete user',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      });
    });
  });

  describe('Additional Exceptions', () => {
    describe('EmailVerificationRequiredException', () => {
      it('should create exception with verification message', () => {
        const exception = new EmailVerificationRequiredException();

        expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(exception.getResponse()).toEqual({
          message: 'Email verification is required to access this resource',
          code: 'EMAIL_VERIFICATION_REQUIRED',
          suggestion: 'Please check your email and verify your account',
        });
      });
    });

    describe('InvalidTokenException', () => {
      it('should create exception with token type', () => {
        const exception = new InvalidTokenException('JWT');

        expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(exception.getResponse()).toEqual({
          message: 'Invalid or expired JWT token',
          code: 'INVALID_TOKEN',
          tokenType: 'JWT',
        });
      });
    });

    describe('SessionExpiredException', () => {
      it('should create exception with session expired message', () => {
        const exception = new SessionExpiredException();

        expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(exception.getResponse()).toEqual({
          message: 'Session has expired',
          code: 'SESSION_EXPIRED',
          suggestion: 'Please sign in again',
        });
      });
    });

    describe('SessionNotFoundException', () => {
      it('should create exception with session not found message', () => {
        const exception = new SessionNotFoundException();

        expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(exception.getResponse()).toEqual({
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND',
          suggestion: 'Please sign in again',
        });
      });
    });

    describe('UserNotFoundException', () => {
      it('should create exception with identifier', () => {
        const exception = new UserNotFoundException('email: test@example.com');

        expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(exception.getResponse()).toEqual({
          message: 'User with email: test@example.com not found',
          code: 'USER_NOT_FOUND',
        });
      });

      it('should create exception without identifier', () => {
        const exception = new UserNotFoundException();

        expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(exception.getResponse()).toEqual({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      });
    });

    describe('EmailServiceException', () => {
      it('should create exception with operation and error', () => {
        const exception = new EmailServiceException(
          'send verification email',
          'SMTP connection failed',
        );

        expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(exception.getResponse()).toEqual({
          message: 'Email service error during send verification email',
          code: 'EMAIL_SERVICE_ERROR',
          operation: 'send verification email',
          error: 'SMTP connection failed',
        });
      });

      it('should create exception without error details', () => {
        const exception = new EmailServiceException('send password reset');

        expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(exception.getResponse()).toEqual({
          message: 'Email service error during send password reset',
          code: 'EMAIL_SERVICE_ERROR',
          operation: 'send password reset',
          error: undefined,
        });
      });
    });

    describe('RedisConnectionException', () => {
      it('should create exception with operation', () => {
        const exception = new RedisConnectionException('session storage');

        expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(exception.getResponse()).toEqual({
          message: 'Redis connection failed during session storage',
          code: 'REDIS_CONNECTION_ERROR',
          operation: 'session storage',
        });
      });
    });

    describe('DatabaseConnectionException', () => {
      it('should create exception with operation', () => {
        const exception = new DatabaseConnectionException('user lookup');

        expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(exception.getResponse()).toEqual({
          message: 'Database connection failed during user lookup',
          code: 'DATABASE_CONNECTION_ERROR',
          operation: 'user lookup',
        });
      });
    });
  });
});
