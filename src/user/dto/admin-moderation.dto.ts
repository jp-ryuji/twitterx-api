import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum ModerationAction {
  SUSPEND = 'suspend',
  UNSUSPEND = 'unsuspend',
  VERIFY = 'verify',
  UNVERIFY = 'unverify',
  SHADOW_BAN = 'shadow_ban',
  UNSHADOW_BAN = 'unshadow_ban',
}

export class AdminModerationDto {
  @ApiProperty({
    enum: ModerationAction,
    description: 'The moderation action to perform',
  })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiPropertyOptional({
    description: 'Reason for the moderation action',
    example: 'Violation of community guidelines',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class SuspiciousActivityDto {
  @ApiProperty({
    description: 'Type of suspicious activity detected',
    example: 'rapid_following',
  })
  @IsString()
  activityType: string;

  @ApiPropertyOptional({
    description: 'Additional details about the suspicious activity',
  })
  @IsString()
  @IsOptional()
  details?: string;

  @ApiPropertyOptional({
    description: 'Whether to automatically apply restrictions',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoRestrict?: boolean = false;
}
