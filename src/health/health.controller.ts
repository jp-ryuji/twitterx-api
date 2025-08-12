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
    const isHealthy = await this.healthService.checkDatabaseHealth();
    const timestamp = new Date().toISOString();

    if (isHealthy) {
      return { status: 'ok', timestamp };
    } else {
      return { status: 'error', timestamp };
    }
  }
}
