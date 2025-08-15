import { ApiProperty } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

import { trimString } from '../../common/transformers';

export class ChangeUsernameDto {
  @ApiProperty({
    description:
      'New username (3-15 characters, alphanumeric and underscores only)',
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
}
