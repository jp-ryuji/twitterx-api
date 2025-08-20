import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { FileUploadService } from './services/file-upload.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, FileUploadService],
  exports: [UserService, FileUploadService],
})
export class UserModule {}
