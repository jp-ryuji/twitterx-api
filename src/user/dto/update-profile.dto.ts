import { ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

// Helper function for safe string transformation
const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
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
    description: 'User bio (maximum 160 characters)',
    example: 'Software developer passionate about technology and innovation.',
    maxLength: 160,
  })
  @IsString()
  @IsOptional()
  @MaxLength(160, { message: 'Bio cannot exceed 160 characters' })
  @Transform(trimString)
  bio?: string;

  @ApiPropertyOptional({
    description: 'User location',
    example: 'San Francisco, CA',
  })
  @IsString()
  @IsOptional()
  @Transform(trimString)
  location?: string;

  @ApiPropertyOptional({
    description: 'Personal website URL',
    example: 'https://johndoe.dev',
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  @IsOptional()
  @Transform(trimString)
  websiteUrl?: string;

  // Note: birthDate is intentionally excluded as it's immutable after registration
}
