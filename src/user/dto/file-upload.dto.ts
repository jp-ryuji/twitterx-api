import { ApiProperty } from '@nestjs/swagger';

import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Validate,
  IsOptional,
} from 'class-validator';

import { IsSafeText } from '../../common/validators';

export class FileUploadDto {
  @ApiProperty({
    description: 'Original filename',
    example: 'profile-picture.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'Filename is too long' })
  @Validate(IsSafeText)
  originalName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({
    description: 'Size of the file in bytes',
    example: 102400,
  })
  size: number;

  @ApiProperty({
    description: 'Sanitized filename for storage',
    example: 'user123_profile_20230101.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'Sanitized filename is too long' })
  sanitizedFileName: string;
}

export class ProfilePictureUploadDto {
  @ApiProperty({
    description: 'Profile picture file',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  file?: any;
}

export class HeaderImageUploadDto {
  @ApiProperty({
    description: 'Header image file',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  file?: any;
}
