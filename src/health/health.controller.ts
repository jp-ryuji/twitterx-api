import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('healthz')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Check the health status of the application and its dependencies (database, Redis)',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
          description: 'Overall health status',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2024-08-13T14:22:00Z',
          description: 'Health check timestamp',
        },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              example: 'ok',
              description: 'Database connection status',
            },
            redis: {
              type: 'string',
              example: 'ok',
              description: 'Redis connection status',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
          description: 'Overall health status',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2024-08-13T14:22:00Z',
          description: 'Health check timestamp',
        },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              example: 'error',
              description: 'Database connection status',
            },
            redis: {
              type: 'string',
              example: 'error',
              description: 'Redis connection status',
            },
          },
        },
      },
    },
  })
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
