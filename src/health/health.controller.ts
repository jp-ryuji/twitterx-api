import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('healthz')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async checkHealth() {
    const [isDatabaseHealthy, isRedisHealthy] = await Promise.all([
      this.healthService.checkDatabaseHealth(),
      this.healthService.checkRedisHealth(),
    ]);

    const timestamp = new Date().toISOString();
    const isHealthy = isDatabaseHealthy && isRedisHealthy;

    if (isHealthy) {
      return {
        status: 'ok',
        timestamp,
        checks: {
          database: isDatabaseHealthy ? 'ok' : 'error',
          redis: isRedisHealthy ? 'ok' : 'error',
        },
      };
    } else {
      return {
        status: 'error',
        timestamp,
        checks: {
          database: isDatabaseHealthy ? 'ok' : 'error',
          redis: isRedisHealthy ? 'ok' : 'error',
        },
      };
    }
  }
}
