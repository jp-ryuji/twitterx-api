import { Global, Module } from '@nestjs/common';

import { MonitoringService } from './services/monitoring.service';

@Global()
@Module({
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class CommonModule {}
