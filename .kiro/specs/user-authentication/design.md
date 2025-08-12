# User Authentication System Design

## Overview

The user authentication system provides comprehensive user registration, authentication, and profile management for the TwitterX-API. The system is built using NestJS with TypeScript, PostgreSQL with Prisma ORM, and Redis for session management. It supports multiple authentication providers (email/password and Google OAuth) and implements Twitter-specific features like unique username handling and account verification.

The design follows NestJS modular architecture patterns with clear separation of concerns, implementing secure authentication flows, robust session management, and comprehensive error handling.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    Client[Client Applications] --> API[NestJS API Gateway]
    API --> AuthModule[Auth Module]
    API --> UserModule[User Module]

    AuthModule --> AuthService[Auth Service]
    AuthModule --> AuthController[Auth Controller]

    UserModule --> UserService[User Service]
    UserModule --> UserController[User Controller]

    AuthService --> PrismaService[Prisma Service]
    UserService --> PrismaService

    AuthService --> RedisService[Redis Service]
    AuthService --> EmailService[Email Service]
    AuthService --> GoogleOAuth[Google OAuth Service]

    PrismaService --> PostgreSQL[(PostgreSQL)]
    RedisService --> Redis[(Redis)]
    EmailService --> SMTP[SMTP Server]
    GoogleOAuth --> GoogleAPI[Google OAuth API]
```

### Module Structure

The authentication system consists of two main modules:

1. **AuthModule** - Handles authentication flows, session management, and OAuth
2. **UserModule** - Manages user profiles, account settings, and user data

## Components and Interfaces

### Core Services

#### AuthService

Primary service handling authentication logic:

- User registration and login with case-insensitive username and email handling
- Automatic generation of usernameLower and emailLower fields from user input
- Session creation and management
- OAuth provider integration
- Password reset and email verification
- Rate limiting and security controls


#### UserService

Service for user profile and account management:

- Profile information updates
- Username management and validation
- Account settings and preferences
- Account suspension and moderation

#### RedisService

Session and caching management:

- Session storage and retrieval
- Rate limiting counters
- Temporary data storage (verification codes, rate limiting)

#### EmailService

Email communication service:

- Email verification
- Password reset emails
- Login alerts and notifications

#### GoogleOAuthService

Google OAuth integration:

- OAuth flow handling
- User profile retrieval from Google
- Token validation and refresh

### Controllers

#### AuthController (`/v1/auth`)

Handles authentication endpoints:

- `POST /signup` - User registration
- `POST /signin` - User login
- `POST /signout` - Sign out current session
- `POST /signout-all` - Sign out all sessions
- `GET /google` - Google OAuth initiation
- `GET /callback/google` - Google OAuth callback
- `PUT /username` - Change username
- `POST /password-reset` - Password reset request
- `POST /verify-email` - Email verification

#### UserController (`/v1/users`)

Handles user profile endpoints:

- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `GET /sessions` - List active sessions
- `DELETE /sessions/:sessionId` - Revoke session
- `DELETE /account` - Deactivate account

### Guards and Middleware

#### JwtAuthGuard

Validates JWT tokens and extracts user information for protected routes.

#### RateLimitGuard

Implements rate limiting for authentication endpoints to prevent abuse.

#### SessionGuard

Validates Redis sessions and handles session refresh logic.

## Data Models

### User Model (Prisma Schema)

```prisma
model User {
  id                    String    @id @default(cuid())
  username              String    @db.VarChar(15) // Original casing for display
  usernameLower         String    @unique @db.VarChar(15) // Auto-generated lowercase version for uniqueness
  email                 String?   // Original casing for display
  emailLower            String?   @unique // Auto-generated lowercase version for uniqueness
  displayName           String?   @db.VarChar(50)
  bio                   String?   @db.VarChar(160)
  location              String?
  websiteUrl            String?
  profilePicturePath    String?
  headerImagePath       String?
  birthDate             DateTime? @db.Date

  // Authentication fields
  password              String?
  emailVerified         Boolean   @default(false)
  emailVerificationToken String?
  passwordResetToken    String?
  passwordResetExpires  DateTime?

  // Twitter-specific fields
  followerCount         Int       @default(0)
  followingCount        Int       @default(0)
  tweetCount            Int       @default(0)
  isVerified            Boolean   @default(false)
  isPrivate             Boolean   @default(false)
  isSuspended           Boolean   @default(false)
  suspensionReason      String?

  // Security fields
  failedLoginAttempts   Int       @default(0)
  lockedUntil           DateTime?
  lastLoginAt           DateTime?
  lastLoginIp           String?

  // Timestamps
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Relations
  sessions              Session[]
  oauthProviders        UserOAuthProvider[]

  @@map("users")
  @@index([usernameLower]) // Index on lowercase for fast lookups
  @@index([emailLower]) // Index on lowercase email for fast lookups
}

model UserOAuthProvider {
  id          String        @id @default(cuid())
  userId      String
  provider    AuthProvider
  providerId  String        // External provider's user ID
  email       String?       // Email from provider (may differ from user.email)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@unique([userId, provider])
  @@map("user_oauth_providers")
}

enum AuthProvider {
  EMAIL
  GOOGLE
  // Future: TWITTER, FACEBOOK, GITHUB, etc.
}
```

### Session Model

```prisma
model Session {
  id          String    @id @default(cuid())
  userId      String
  sessionToken String   @unique
  deviceInfo  String?
  ipAddress   String?
  userAgent   String?
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

### DTOs (Data Transfer Objects)

#### Authentication DTOs

```typescript
// Registration
export class SignUpDto {
  @IsString()
  @Length(3, 15)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string; // Preserve original casing

  @IsEmail()
  @IsOptional()
  email?: string; // Preserve original casing

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  displayName?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string; // Format: YYYY-MM-DD, set once during registration
}

// Login
export class SignInDto {
  @IsString()
  emailOrUsername: string;

  @IsString()
  password: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}

// Profile Update
export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  bio?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  // Note: birthDate is not included - it's set only during registration and cannot be updated
}
```

## Error Handling

### Custom Exception Classes

```typescript
export class AuthenticationException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.UNAUTHORIZED) {
    super(message, statusCode);
  }
}

export class UsernameUnavailableException extends HttpException {
  constructor(username: string, suggestions: string[]) {
    super({
      message: `Username '${username}' is not available`,
      suggestions,
      code: 'USERNAME_UNAVAILABLE'
    }, HttpStatus.CONFLICT);
  }
}

export class AccountSuspendedException extends HttpException {
  constructor(reason?: string) {
    super({
      message: 'Account has been suspended',
      reason,
      code: 'ACCOUNT_SUSPENDED'
    }, HttpStatus.FORBIDDEN);
  }
}

export class RateLimitExceededException extends HttpException {
  constructor(retryAfter: number) {
    super({
      message: 'Rate limit exceeded',
      retryAfter,
      code: 'RATE_LIMIT_EXCEEDED'
    }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
```

### Error Response Format

All API errors follow a consistent format:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  code?: string;
  details?: any;
}
```

### Specific Error Scenarios

1. **Username Validation Errors**
   - Invalid characters: Returns format requirements
   - Length violations: Returns length constraints
   - Already taken: Returns suggestions for alternatives

2. **Authentication Errors**
   - Invalid credentials: Generic "Invalid credentials" message
   - Account locked: Returns lockout duration
   - Account suspended: Returns suspension reason if available

3. **Rate Limiting Errors**
   - Returns retry-after header
   - Includes current limit and reset time

## Testing Strategy

### Unit Testing

#### Service Layer Testing

- **AuthService**: Mock Prisma and Redis dependencies
- **UserService**: Test profile management logic
- **RedisService**: Mock Redis client operations
- **EmailService**: Mock SMTP transport

#### Controller Testing

- **AuthController**: Test endpoint responses and validation
- **UserController**: Test authorization and data transformation

#### Guard Testing

- **JwtAuthGuard**: Test token validation scenarios
- **RateLimitGuard**: Test rate limiting logic
- **SessionGuard**: Test session validation

### Integration Testing

#### Database Integration

- Test Prisma model operations
- Test database constraints and relationships
- Test transaction handling

#### Redis Integration

- Test session storage and retrieval
- Test rate limiting counters
- Test cache invalidation

#### OAuth Integration

- Mock Google OAuth responses
- Test OAuth flow error scenarios
- Test token refresh logic

### End-to-End Testing

#### Authentication Flows

- Complete registration flow with email verification
- Login flow with session creation
- OAuth flow with provider integration
- Password reset flow

#### Security Testing

- Rate limiting enforcement
- Session security and expiration
- CSRF protection validation
- Input validation and sanitization

#### Error Handling Testing

- Test all error scenarios
- Verify error response formats
- Test error logging and monitoring

### Test Data Management

#### Test Database Setup

- Separate test database with Docker Compose
- Database seeding for consistent test data
- Cleanup between test runs

#### Mock Strategies

- Mock external services (Google OAuth, SMTP)
- Mock Redis for unit tests
- Use test doubles for complex dependencies

## Security Considerations

### Password Security

- Use bcrypt with salt rounds of 12
- Implement password strength validation
- Secure password reset token generation

### Session Security

- HttpOnly, Secure, SameSite cookie settings
- Session rotation on privilege escalation
- Automatic session cleanup for expired sessions

### Rate Limiting Strategy

- IP-based rate limiting for authentication endpoints
- User-based rate limiting for authenticated actions
- Exponential backoff for failed attempts

### CSRF Protection

- CSRF tokens for state-changing operations
- Double-submit cookie pattern
- Origin header validation

### Input Validation

- Comprehensive DTO validation with class-validator
- SQL injection prevention through Prisma
- XSS prevention through input sanitization

### Audit Logging

- Log all authentication events
- Track failed login attempts
- Monitor suspicious activity patterns

## Performance Considerations

### Database Optimization

- Indexes on frequently queried fields (username, email)
- Connection pooling configuration
- Query optimization for user lookups

### Redis Optimization

- Session data structure optimization
- TTL management for temporary data
- Connection pooling for Redis client

### Caching Strategy

- Cache user profile data with appropriate TTL
- Cache username availability checks
- Implement cache invalidation on updates

## Deployment and Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/twitterx

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Session Configuration
WEB_SESSION_TIMEOUT_DAYS=30
MOBILE_SESSION_TIMEOUT_DAYS=90

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/v1/auth/callback/google

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@yourapp.com
SMTP_PASS=your-smtp-password

# Security
PASSWORD_MIN_LENGTH=8
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Rate Limiting
SIGNUP_RATE_LIMIT_PER_IP=10
LOGIN_RATE_LIMIT_PER_IP=20
```

### Health Checks

- Database connectivity check
- Redis connectivity check
- External service availability (Google OAuth, SMTP)

This design provides a comprehensive, secure, and scalable authentication system that meets all the specified requirements while following NestJS best practices and maintaining high code quality standards.
