import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './services';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService],
  exports: [AuthService],
})
export class AuthModule {}
