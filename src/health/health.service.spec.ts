import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { HealthService } from './health.service';

// Create a mock logger class that satisfies TypeScript
class MockLogger extends Logger {
  error = jest.fn();
}

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            ping: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);

    // Replace the service's logger with our mock
    const mockLogger = new MockLogger();

    (service as any).logger = mockLogger;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDatabaseHealth', () => {
    it('should return true when database query succeeds', async () => {
      const mockFn = prismaService.$queryRaw as jest.Mock;
      // Use void to avoid the unused expression error
      void mockFn.mockResolvedValueOnce([{ '1': 1 }]);

      const result = await service.checkDatabaseHealth();
      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(prismaService.$queryRaw).toHaveBeenCalledWith`SELECT 1`;
    });

    it('should return false when database query fails', async () => {
      const mockFn = prismaService.$queryRaw as jest.Mock;
      // Use void to avoid the unused expression error
      void mockFn.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      const result = await service.checkDatabaseHealth();
      expect(result).toBe(false);
    });
  });

  describe('checkRedisHealth', () => {
    it('should return true when Redis ping succeeds', async () => {
      const mockFn = redisService.ping as jest.Mock;
      void mockFn.mockResolvedValueOnce('PONG');

      const result = await service.checkRedisHealth();
      expect(result).toBe(true);
      expect(mockFn).toHaveBeenCalled();
    });

    it('should return false when Redis ping fails', async () => {
      const mockFn = redisService.ping as jest.Mock;
      void mockFn.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await service.checkRedisHealth();
      expect(result).toBe(false);
    });

    it('should return false when Redis ping returns unexpected response', async () => {
      const mockFn = redisService.ping as jest.Mock;
      void mockFn.mockResolvedValueOnce('UNEXPECTED');

      const result = await service.checkRedisHealth();
      expect(result).toBe(false);
    });
  });
});
