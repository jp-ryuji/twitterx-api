import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { RedisModule } from '../redis/redis.module';

import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';
import { MonitoringService } from './services/monitoring.service';
import { ValidationService } from './services/validation.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    MonitoringService,
    RequestLoggingMiddleware,
    SecurityMiddleware,
    ValidationService,
  ],
  exports: [
    MonitoringService,
    RequestLoggingMiddleware,
    SecurityMiddleware,
    ValidationService,
  ],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware to all routes
    consumer.apply(RequestLoggingMiddleware, SecurityMiddleware).forRoutes('*');
  }
}
