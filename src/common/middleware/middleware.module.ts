import { Module } from '@nestjs/common';

import { RedisModule } from '../../redis/redis.module';
import { CommonModule } from '../common.module';

import { CsrfMiddleware } from './csrf.middleware';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { SecurityTestController } from './security-test.controller';
import { SecurityMiddleware } from './security.middleware';

@Module({
  imports: [RedisModule, CommonModule],
  controllers: [SecurityTestController],
  providers: [CsrfMiddleware, RequestLoggingMiddleware, SecurityMiddleware],
  exports: [CsrfMiddleware, RequestLoggingMiddleware, SecurityMiddleware],
})
export class MiddlewareModule {}
