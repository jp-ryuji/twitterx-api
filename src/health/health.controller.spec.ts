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
            checkRedisHealth: jest.fn(),
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
    it('should return status ok when both database and Redis are healthy', async () => {
      (healthService.checkDatabaseHealth as jest.Mock).mockResolvedValue(true);
      (healthService.checkRedisHealth as jest.Mock).mockResolvedValue(true);

      const result = await controller.checkHealth();
      expect(result).toEqual({
        status: 'ok',

        timestamp: expect.any(String),
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      });
    });

    it('should return status error when database is unhealthy', async () => {
      (healthService.checkDatabaseHealth as jest.Mock).mockResolvedValue(false);
      (healthService.checkRedisHealth as jest.Mock).mockResolvedValue(true);

      const result = await controller.checkHealth();
      expect(result).toEqual({
        status: 'error',

        timestamp: expect.any(String),
        checks: {
          database: 'error',
          redis: 'ok',
        },
      });
    });

    it('should return status error when Redis is unhealthy', async () => {
      (healthService.checkDatabaseHealth as jest.Mock).mockResolvedValue(true);
      (healthService.checkRedisHealth as jest.Mock).mockResolvedValue(false);

      const result = await controller.checkHealth();
      expect(result).toEqual({
        status: 'error',

        timestamp: expect.any(String),
        checks: {
          database: 'ok',
          redis: 'error',
        },
      });
    });

    it('should return status error when both database and Redis are unhealthy', async () => {
      (healthService.checkDatabaseHealth as jest.Mock).mockResolvedValue(false);
      (healthService.checkRedisHealth as jest.Mock).mockResolvedValue(false);

      const result = await controller.checkHealth();
      expect(result).toEqual({
        status: 'error',

        timestamp: expect.any(String),
        checks: {
          database: 'error',
          redis: 'error',
        },
      });
    });
  });
});
