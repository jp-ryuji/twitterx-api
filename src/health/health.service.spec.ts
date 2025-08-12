import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { HealthService } from './health.service';

// Create a mock logger class that satisfies TypeScript
class MockLogger extends Logger {
  error = jest.fn();
}

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: PrismaService;

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
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Replace the service's logger with our mock
    const mockLogger = new MockLogger();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (service as any).logger = mockLogger;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDatabaseHealth', () => {
    it('should return true when database query succeeds', async () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockFn = prismaService.$queryRaw as jest.Mock;
      // Use void to avoid the unused expression error
      void mockFn.mockResolvedValueOnce([{ '1': 1 }]);

      const result = await service.checkDatabaseHealth();
      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unused-expressions
      expect(prismaService.$queryRaw).toHaveBeenCalledWith`SELECT 1`;
    });

    it('should return false when database query fails', async () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockFn = prismaService.$queryRaw as jest.Mock;
      // Use void to avoid the unused expression error
      void mockFn.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      const result = await service.checkDatabaseHealth();
      expect(result).toBe(false);
    });
  });
});
