import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            checkDatabaseHealth: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkHealth', () => {
    it('should return status ok when database is healthy', async () => {
      (healthService.checkDatabaseHealth as jest.Mock).mockResolvedValue(true);

      const result = await controller.checkHealth();
      expect(result).toEqual({
        status: 'ok',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        timestamp: expect.any(String),
      });
    });

    it('should return status error when database is unhealthy', async () => {
      (healthService.checkDatabaseHealth as jest.Mock).mockResolvedValue(false);

      const result = await controller.checkHealth();
      expect(result).toEqual({
        status: 'error',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        timestamp: expect.any(String),
      });
    });
  });
});
