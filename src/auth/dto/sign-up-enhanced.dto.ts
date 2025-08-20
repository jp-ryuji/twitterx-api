import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
  Validate,
} from 'class-validator';

import { SecurityUtils } from '../../auth/utils/security.utils';
import { IsSafeDisplayName, IsSafeUsername } from '../../common/validators';

/**
 * Transform function to sanitize and trim string input
 */
export function sanitizeStringTransform({
  value,
}: TransformFnParams): string | undefined {
  if (typeof value !== 'string') return undefined;
  return SecurityUtils.sanitizeString(value);
}

/**
 * Transform function to sanitize email input
 */
export function sanitizeEmailTransform({
  value,
}: TransformFnParams): string | undefined {
  if (typeof value !== 'string') return undefined;
  return SecurityUtils.sanitizeEmail(value);
}

/**
 * Transform function to sanitize username input
 */
export function sanitizeUsernameTransform({
  value,
}: TransformFnParams): string | undefined {
  if (typeof value !== 'string') return undefined;
  return SecurityUtils.sanitizeUsername(value);
}

/**
 * Transform function for general text sanitization
 */
export function sanitizeTextTransform({
  value,
}: TransformFnParams): string | undefined {
  if (typeof value !== 'string') return undefined;
  return SecurityUtils.sanitizeText(value);
}

export class SignUpDto {
  @ApiProperty({
    description:
      'Unique username (3-15 characters, alphanumeric and underscore only)',
    example: 'john_doe123',
    minLength: 3,
    maxLength: 15,
    pattern: '^[a-zA-Z0-9_]+$',
  })
  @IsString()
  @Length(3, 15, { message: 'Username must be between 3 and 15 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  @Validate(IsSafeUsername)
  @Transform(sanitizeUsernameTransform)
  username: string;

  @ApiPropertyOptional({
    description: 'Email address for account verification and notifications',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  @Transform(sanitizeEmailTransform)
  email?: string;

  @ApiProperty({
    description: 'Password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({
    description: 'Display name (maximum 50 characters)',
    example: 'John Doe',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @Validate(IsSafeDisplayName)
  @MaxLength(50, { message: 'Display name cannot exceed 50 characters' })
  @Transform(sanitizeStringTransform)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Birth date (YYYY-MM-DD format, set once during registration)',
    example: '1990-01-15',
    format: 'date',
  })
  @IsDateString({}, { message: 'Birth date must be in YYYY-MM-DD format' })
  @IsOptional()
  birthDate?: string;
}
