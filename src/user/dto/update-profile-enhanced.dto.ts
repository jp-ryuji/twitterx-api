import { ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsUrl,
  Validate,
} from 'class-validator';

import { SecurityUtils } from '../../auth/utils/security.utils';
import {
  IsSafeDisplayName,
  IsSafeText,
  IsSafeLocation,
} from '../../common/validators';

/**
 * Transform function to sanitize and trim string input
 */
export function sanitizeStringTransform({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  return SecurityUtils.sanitizeString(value);
}

/**
 * Transform function for general text sanitization
 */
export function sanitizeTextTransform({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  return SecurityUtils.sanitizeText(value);
}

/**
 * Transform function for URL sanitization (doesn't escape HTML entities)
 */
export function sanitizeUrlTransform({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  // For URLs, we just trim and normalize, but don't escape HTML entities
  return value.trim();
}

export class UpdateProfileDto {
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
    description: 'User bio (maximum 160 characters)',
    example: 'Software developer passionate about technology and innovation.',
    maxLength: 160,
  })
  @IsString()
  @IsOptional()
  @Validate(IsSafeText)
  @MaxLength(160, { message: 'Bio cannot exceed 160 characters' })
  @Transform(sanitizeTextTransform)
  bio?: string;

  @ApiPropertyOptional({
    description: 'User location',
    example: 'San Francisco, CA',
  })
  @IsString()
  @IsOptional()
  @Validate(IsSafeLocation)
  @Transform(sanitizeStringTransform)
  location?: string;

  @ApiPropertyOptional({
    description: 'Personal website URL',
    example: 'https://johndoe.dev',
  })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'Please provide a valid URL with http or https protocol' },
  )
  @IsOptional()
  @Transform(sanitizeUrlTransform)
  websiteUrl?: string;

  // Note: birthDate is intentionally excluded as it's immutable after registration
}
