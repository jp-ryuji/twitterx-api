import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
} from 'class-validator';

import { trimString, trimAndLowercase } from '../../common/transformers';

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
  @Transform(trimString)
  username: string;

  @ApiPropertyOptional({
    description: 'Email address for account verification and notifications',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  @Transform(trimAndLowercase)
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
  @MaxLength(50, { message: 'Display name cannot exceed 50 characters' })
  @Transform(trimString)
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
