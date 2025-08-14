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
