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
