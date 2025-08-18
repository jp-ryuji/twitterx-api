import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { RedisModule } from '../redis/redis.module';

import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';
import { MonitoringService } from './services/monitoring.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [MonitoringService, RequestLoggingMiddleware, SecurityMiddleware],
  exports: [MonitoringService, RequestLoggingMiddleware, SecurityMiddleware],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware to all routes
    consumer.apply(RequestLoggingMiddleware, SecurityMiddleware).forRoutes('*');
  }
}
