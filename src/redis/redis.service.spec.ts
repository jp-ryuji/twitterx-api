import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from './redis.service';

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  multi: jest.fn(),
  ttl: jest.fn(),
  set: jest.fn(),
  exists: jest.fn(),
  ping: jest.fn(),
};

const mockPipeline = {
  incr: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  ttl: jest.fn().mockReturnThis(),
  get: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

// Mock the redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();
    mockRedisClient.multi.mockReturnValue(mockPipeline);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Lifecycle', () => {
    it('should connect to Redis on module init', async () => {
      await service.onModuleInit();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
    });

    it('should disconnect from Redis on module destroy', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should handle Redis connection errors', async () => {
      await service.onModuleInit();

      // Simulate error event
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const errorCall = mockRedisClient.on.mock.calls.find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (call) => call[0] === 'error',
      );
      const testError = new Error('Connection failed');
      if (errorCall) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const errorHandler = errorCall[1] as (error: Error) => void;
        errorHandler(testError);
      }

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Redis Client Error',
        testError,
      );
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('setSession', () => {
      it('should store session data with TTL', async () => {
        const sessionId = 'test-session-id';
        const sessionData = { userId: '123', username: 'testuser' };
        const ttl = 3600;

        await service.setSession(sessionId, sessionData, ttl);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `session:${sessionId}`,
          ttl,
          JSON.stringify(sessionData),
        );
      });
    });

    describe('getSession', () => {
      it('should retrieve and parse session data', async () => {
        const sessionId = 'test-session-id';
        const sessionData = { userId: '123', username: 'testuser' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

        const result = await service.getSession(sessionId);

        expect(mockRedisClient.get).toHaveBeenCalledWith(
          `session:${sessionId}`,
        );
        expect(result).toEqual(sessionData);
      });

      it('should return null when session not found', async () => {
        const sessionId = 'non-existent-session';
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.getSession(sessionId);

        expect(result).toBeNull();
      });

      it('should return null and log error when JSON parsing fails', async () => {
        const sessionId = 'invalid-session';
        mockRedisClient.get.mockResolvedValue('invalid-json');

        const result = await service.getSession(sessionId);

        expect(result).toBeNull();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          `Failed to parse session data for ${sessionId}:`,
          expect.any(Error),
        );
      });
    });

    describe('deleteSession', () => {
      it('should delete session from Redis', async () => {
        const sessionId = 'test-session-id';

        await service.deleteSession(sessionId);

        expect(mockRedisClient.del).toHaveBeenCalledWith(
          `session:${sessionId}`,
        );
      });
    });

    describe('deleteUserSessions', () => {
      it('should delete all sessions for a user', async () => {
        const userId = 'user123';
        const sessionKeys = [
          `session:${userId}:session1`,
          `session:${userId}:session2`,
        ];
        mockRedisClient.keys.mockResolvedValue(sessionKeys);

        await service.deleteUserSessions(userId);

        expect(mockRedisClient.keys).toHaveBeenCalledWith(
          `session:${userId}:*`,
        );
        expect(mockRedisClient.del).toHaveBeenCalledWith(sessionKeys);
      });

      it('should handle case when user has no sessions', async () => {
        const userId = 'user123';
        mockRedisClient.keys.mockResolvedValue([]);

        await service.deleteUserSessions(userId);

        expect(mockRedisClient.keys).toHaveBeenCalledWith(
          `session:${userId}:*`,
        );
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });
    });

    describe('getUserSessionIds', () => {
      it('should return session IDs for a user', async () => {
        const userId = 'user123';
        const sessionKeys = [
          `session:${userId}:session1`,
          `session:${userId}:session2`,
        ];
        mockRedisClient.keys.mockResolvedValue(sessionKeys);

        const result = await service.getUserSessionIds(userId);

        expect(result).toEqual(['session1', 'session2']);
      });
    });

    describe('refreshSession', () => {
      it('should update session TTL and return true on success', async () => {
        const sessionId = 'test-session-id';
        const ttl = 3600;
        mockRedisClient.expire.mockResolvedValue(1);

        const result = await service.refreshSession(sessionId, ttl);

        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          `session:${sessionId}`,
          ttl,
        );
        expect(result).toBe(true);
      });

      it('should return false when session does not exist', async () => {
        const sessionId = 'non-existent-session';
        const ttl = 3600;
        mockRedisClient.expire.mockResolvedValue(0);

        const result = await service.refreshSession(sessionId, ttl);

        expect(result).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('incrementRateLimit', () => {
      it('should increment counter and return limit status', async () => {
        const key = 'user123';
        const windowSeconds = 60;
        const maxAttempts = 5;
        const currentCount = 3;
        const ttl = 45;

        mockPipeline.exec.mockResolvedValue([currentCount, 1, ttl]);

        const result = await service.incrementRateLimit(
          key,
          windowSeconds,
          maxAttempts,
        );

        expect(mockRedisClient.multi).toHaveBeenCalled();
        expect(mockPipeline.incr).toHaveBeenCalledWith(`rate_limit:${key}`);
        expect(mockPipeline.expire).toHaveBeenCalledWith(
          `rate_limit:${key}`,
          windowSeconds,
        );
        expect(mockPipeline.ttl).toHaveBeenCalledWith(`rate_limit:${key}`);
        expect(mockPipeline.exec).toHaveBeenCalled();

        expect(result.count).toBe(currentCount);
        expect(result.isLimitExceeded).toBe(false);
        expect(result.resetTime).toBeGreaterThan(Date.now());
      });

      it('should detect when rate limit is exceeded', async () => {
        const key = 'user123';
        const windowSeconds = 60;
        const maxAttempts = 5;
        const currentCount = 6;
        const ttl = 45;

        mockPipeline.exec.mockResolvedValue([currentCount, 1, ttl]);

        const result = await service.incrementRateLimit(
          key,
          windowSeconds,
          maxAttempts,
        );

        expect(result.count).toBe(currentCount);
        expect(result.isLimitExceeded).toBe(true);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          `Rate limit exceeded for key: ${key}, count: ${currentCount}`,
        );
      });
    });

    describe('getRateLimit', () => {
      it('should return current count and TTL', async () => {
        const key = 'user123';
        const count = '3';
        const ttl = 45;

        mockPipeline.exec.mockResolvedValue([count, ttl]);

        const result = await service.getRateLimit(key);

        expect(mockPipeline.get).toHaveBeenCalledWith(`rate_limit:${key}`);
        expect(mockPipeline.ttl).toHaveBeenCalledWith(`rate_limit:${key}`);
        expect(result.count).toBe(3);
        expect(result.ttl).toBe(ttl);
      });

      it('should return 0 count when key does not exist', async () => {
        const key = 'user123';
        const ttl = -2;

        mockPipeline.exec.mockResolvedValue([null, ttl]);

        const result = await service.getRateLimit(key);

        expect(result.count).toBe(0);
        expect(result.ttl).toBe(ttl);
      });
    });

    describe('resetRateLimit', () => {
      it('should delete rate limit key', async () => {
        const key = 'user123';

        await service.resetRateLimit(key);

        expect(mockRedisClient.del).toHaveBeenCalledWith(`rate_limit:${key}`);
      });
    });
  });

  describe('Generic Redis Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('set', () => {
      it('should set key-value with TTL', async () => {
        const key = 'test-key';
        const value = 'test-value';
        const ttl = 3600;

        await service.set(key, value, ttl);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(key, ttl, value);
      });

      it('should set key-value without TTL', async () => {
        const key = 'test-key';
        const value = 'test-value';

        await service.set(key, value);

        expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
      });
    });

    describe('get', () => {
      it('should get value by key', async () => {
        const key = 'test-key';
        const value = 'test-value';
        mockRedisClient.get.mockResolvedValue(value);

        const result = await service.get(key);

        expect(mockRedisClient.get).toHaveBeenCalledWith(key);
        expect(result).toBe(value);
      });
    });

    describe('delete', () => {
      it('should delete key', async () => {
        const key = 'test-key';

        await service.delete(key);

        expect(mockRedisClient.del).toHaveBeenCalledWith(key);
      });
    });

    describe('exists', () => {
      it('should return true when key exists', async () => {
        const key = 'test-key';
        mockRedisClient.exists.mockResolvedValue(1);

        const result = await service.exists(key);

        expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
        expect(result).toBe(true);
      });

      it('should return false when key does not exist', async () => {
        const key = 'test-key';
        mockRedisClient.exists.mockResolvedValue(0);

        const result = await service.exists(key);

        expect(result).toBe(false);
      });
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should ping Redis server', async () => {
      const pingResponse = 'PONG';
      mockRedisClient.ping.mockResolvedValue(pingResponse);

      const result = await service.ping();

      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(result).toBe(pingResponse);
    });
  });

  describe('getClient', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return Redis client instance', () => {
      const client = service.getClient();

      expect(client).toBe(mockRedisClient);
    });
  });
});
