import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthenticationException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.UNAUTHORIZED,
  ) {
    super(message, statusCode);
  }
}

export class UsernameUnavailableException extends HttpException {
  constructor(username: string, suggestions: string[] = []) {
    super(
      {
        message: `Username '${username}' is not available`,
        suggestions,
        code: 'USERNAME_UNAVAILABLE',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class EmailAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(
      {
        message: `An account with this email (${email}) already exists`,
        code: 'EMAIL_ALREADY_EXISTS',
        suggestion: 'Try signing in instead',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidPasswordException extends HttpException {
  constructor(errors: string[]) {
    super(
      {
        message: 'Password does not meet security requirements',
        errors,
        code: 'INVALID_PASSWORD',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super(
      {
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class AccountLockedException extends HttpException {
  constructor(lockedUntil: Date) {
    const lockoutDuration = Math.ceil(
      (lockedUntil.getTime() - Date.now()) / (1000 * 60),
    );
    super(
      {
        message:
          'Account is temporarily locked due to too many failed login attempts',
        lockedUntil: lockedUntil.toISOString(),
        lockoutDurationMinutes: lockoutDuration,
        code: 'ACCOUNT_LOCKED',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class AccountSuspendedException extends HttpException {
  constructor(reason?: string) {
    super(
      {
        message: 'Account has been suspended',
        reason,
        code: 'ACCOUNT_SUSPENDED',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class RateLimitExceededException extends HttpException {
  constructor(retryAfter: number) {
    super(
      {
        message: 'Rate limit exceeded',
        retryAfter,
        code: 'RATE_LIMIT_EXCEEDED',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class OAuthConfigurationException extends HttpException {
  constructor(provider: string) {
    super(
      {
        message: `OAuth configuration for ${provider} is missing or invalid`,
        code: 'OAUTH_CONFIGURATION_ERROR',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class OAuthTokenExchangeException extends HttpException {
  constructor(provider: string, error?: string) {
    super(
      {
        message: `Failed to exchange authorization code with ${provider}`,
        error,
        code: 'OAUTH_TOKEN_EXCHANGE_ERROR',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OAuthProfileFetchException extends HttpException {
  constructor(provider: string, error?: string) {
    super(
      {
        message: `Failed to fetch user profile from ${provider}`,
        error,
        code: 'OAUTH_PROFILE_FETCH_ERROR',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OAuthInvalidStateException extends HttpException {
  constructor() {
    super(
      {
        message: 'Invalid OAuth state parameter',
        code: 'OAUTH_INVALID_STATE',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OAuthProviderLinkException extends HttpException {
  constructor(provider: string, email: string) {
    super(
      {
        message: `Cannot link ${provider} account. An account with email ${email} already exists with different authentication method`,
        code: 'OAUTH_PROVIDER_LINK_ERROR',
        suggestion: 'Try signing in with your existing credentials first',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class SuspiciousActivityException extends HttpException {
  constructor(reason: string) {
    super(
      {
        message: 'Suspicious activity detected',
        reason,
        code: 'SUSPICIOUS_ACTIVITY',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ShadowBannedException extends HttpException {
  constructor() {
    super(
      {
        message: 'Account access restricted',
        code: 'SHADOW_BANNED',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InsufficientPermissionsException extends HttpException {
  constructor(action: string) {
    super(
      {
        message: `Insufficient permissions to perform action: ${action}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class EmailVerificationRequiredException extends HttpException {
  constructor() {
    super(
      {
        message: 'Email verification is required to access this resource',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        suggestion: 'Please check your email and verify your account',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidTokenException extends HttpException {
  constructor(tokenType: string) {
    super(
      {
        message: `Invalid or expired ${tokenType} token`,
        code: 'INVALID_TOKEN',
        tokenType,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class SessionExpiredException extends HttpException {
  constructor() {
    super(
      {
        message: 'Session has expired',
        code: 'SESSION_EXPIRED',
        suggestion: 'Please sign in again',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class SessionNotFoundException extends HttpException {
  constructor() {
    super(
      {
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        suggestion: 'Please sign in again',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class UserNotFoundException extends HttpException {
  constructor(identifier?: string) {
    super(
      {
        message: identifier
          ? `User with ${identifier} not found`
          : 'User not found',
        code: 'USER_NOT_FOUND',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class EmailServiceException extends HttpException {
  constructor(operation: string, error?: string) {
    super(
      {
        message: `Email service error during ${operation}`,
        code: 'EMAIL_SERVICE_ERROR',
        operation,
        error,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class RedisConnectionException extends HttpException {
  constructor(operation: string) {
    super(
      {
        message: `Redis connection failed during ${operation}`,
        code: 'REDIS_CONNECTION_ERROR',
        operation,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class DatabaseConnectionException extends HttpException {
  constructor(operation: string) {
    super(
      {
        message: `Database connection failed during ${operation}`,
        code: 'DATABASE_CONNECTION_ERROR',
        operation,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
