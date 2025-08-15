import { ApiProperty } from '@nestjs/swagger';

import { IsOptional, IsBoolean } from 'class-validator';

export class SignOutDto {
  @ApiProperty({
    description: 'Whether to sign out from all devices',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'signOutAll must be a boolean' })
  signOutAll?: boolean;
}
