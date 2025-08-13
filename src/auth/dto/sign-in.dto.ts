import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

// Helper function for safe string transformation
const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SignInDto {
  @ApiProperty({
    description: 'Username or email address (case-insensitive)',
    example: 'john_doe123',
  })
  @IsString()
  @Transform(trimString)
  emailOrUsername: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'Remember login for extended session duration',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean = false;
}
