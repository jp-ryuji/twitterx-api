import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Username with original casing',
    example: 'john_doe123',
  })
  username: string;

  @ApiPropertyOptional({
    description: 'Email address with original casing',
    example: 'john.doe@example.com',
  })
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe',
  })
  displayName?: string | null;

  @ApiPropertyOptional({
    description: 'User bio',
    example: 'Software developer passionate about technology.',
  })
  bio?: string | null;

  @ApiPropertyOptional({
    description: 'User location',
    example: 'San Francisco, CA',
  })
  location?: string | null;

  @ApiPropertyOptional({
    description: 'Personal website URL',
    example: 'https://johndoe.dev',
  })
  websiteUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Profile picture path',
    example: '/uploads/profiles/user123.jpg',
  })
  profilePicturePath?: string | null;

  @ApiPropertyOptional({
    description: 'Header image path',
    example: '/uploads/headers/user123.jpg',
  })
  headerImagePath?: string | null;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Account verification status (blue checkmark)',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Account privacy setting',
    example: false,
  })
  isPrivate: boolean;

  @ApiProperty({
    description: 'Follower count',
    example: 150,
  })
  followerCount: number;

  @ApiProperty({
    description: 'Following count',
    example: 75,
  })
  followingCount: number;

  @ApiProperty({
    description: 'Tweet count',
    example: 42,
  })
  tweetCount: number;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last profile update date',
    example: '2024-08-13T14:22:00Z',
  })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example:
      'Registration successful. Please check your email to verify your account.',
  })
  message: string;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiPropertyOptional({
    description: 'Whether email verification is required',
    example: true,
  })
  requiresEmailVerification?: boolean;

  @ApiPropertyOptional({
    description: 'JWT access token (for login responses)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Token type (for login responses)',
    example: 'Bearer',
  })
  tokenType?: string;

  @ApiPropertyOptional({
    description: 'Token expiration time in seconds (for login responses)',
    example: 3600,
  })
  expiresIn?: number;

  @ApiPropertyOptional({
    description: 'Session token (for login responses)',
    example: 'sess_clx1234567890abcdef',
  })
  sessionToken?: string;

  @ApiPropertyOptional({
    description: 'Session expiration date (for login responses)',
    example: '2024-09-13T14:22:00Z',
  })
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Authentication provider (for OAuth responses)',
    example: 'google',
  })
  provider?: string;
}

export class SignUpResponseDto {
  @ApiProperty({
    description: 'Success message',
    example:
      'Account created successfully. Please check your email for verification.',
  })
  message: string;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Email verification required flag',
    example: true,
  })
  emailVerificationRequired: boolean;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Username is already taken',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    description: 'Request timestamp',
    example: '2024-08-13T14:22:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/v1/auth/signup',
  })
  path: string;

  @ApiPropertyOptional({
    description: 'Error code for client handling',
    example: 'USERNAME_UNAVAILABLE',
  })
  code?: string;

  @ApiPropertyOptional({
    description: 'Additional error details',
    example: { suggestions: ['john_doe124', 'john_doe_2024'] },
  })
  details?: any;
}
