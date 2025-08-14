import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, RateLimitGuard, SessionGuard } from './guards';
import {
  PasswordService,
  JwtService as CustomJwtService,
  SessionService,
  GoogleOAuthService,
} from './services';
import { JwtStrategy, GoogleOAuthStrategy } from './strategies';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    CustomJwtService,
    SessionService,
    GoogleOAuthService,
    JwtStrategy,
    GoogleOAuthStrategy,
    JwtAuthGuard,
    RateLimitGuard,
    SessionGuard,
  ],
  exports: [
    AuthService,
    CustomJwtService,
    SessionService,
    GoogleOAuthService,
    JwtAuthGuard,
    RateLimitGuard,
    SessionGuard,
  ],
})
export class AuthModule {}
