import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { Request, Response } from 'express';

import { RedisService } from '../../redis/redis.service';
import { RateLimitExceededException } from '../exceptions/auth.exceptions';

import {
  RateLimitGuard,
  RateLimitOptions,
  RATE_LIMIT_KEY,
} from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let redisService: jest.Mocked<RedisService>;
  let reflector: jest.Mocked<Reflector>;

  const mockRedisService = {
    incrementRateLimit: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    redisService = module.get(RedisService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    request: Partial<Request>,
    response: Partial<Response> = {},
  ): ExecutionContext => {
    const mockResponse = {
      setHeader: jest.fn(),
      ...response,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request as Request,
        getResponse: () => mockResponse as Response,
      }),
      getHandler: jest.fn(),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    const mockRateLimitOptions: RateLimitOptions = {
      maxAttempts: 5,
      windowSeconds: 300,
      keyPrefix: 'login',
    };

    it('should allow request when no rate limit options are configured', async () => {
      const mockRequest = { ip: '192.168.1.1', headers: {} };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.incrementRateLimit).not.toHaveBeenCalled();
    });

    it('should allow request when rate limit is not exceeded', async () => {
      const mockRequest = { ip: '192.168.1.1', headers: {} };
      const mockResponse = { setHeader: jest.fn() };
      const context = createMockContext(mockRequest, mockResponse);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 3,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'login:192.168.1.1',
        300,
        5,
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '5',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '2',
      );
    });

    it('should throw RateLimitExceededException when rate limit is exceeded', async () => {
      const mockRequest = { ip: '192.168.1.1', headers: {} };
      const mockResponse = { setHeader: jest.fn() };
      const context = createMockContext(mockRequest, mockResponse);
      const resetTime = Math.floor(Date.now() / 1000) + 300;

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 6,
        isLimitExceeded: true,
        resetTime,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        RateLimitExceededException,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '5',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '0',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        resetTime.toString(),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.any(String),
      );
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1',
        },
        ip: '10.0.0.1',
      };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'login:203.0.113.1',
        300,
        5,
      );
    });

    it('should extract IP from X-Real-IP header when X-Forwarded-For is not present', async () => {
      const mockRequest = {
        headers: {
          'x-real-ip': '203.0.113.2',
        },
        ip: '10.0.0.1',
      };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'login:203.0.113.2',
        300,
        5,
      );
    });

    it('should extract IP from CF-Connecting-IP header for Cloudflare', async () => {
      const mockRequest = {
        headers: {
          'cf-connecting-ip': '203.0.113.3',
        },
        ip: '10.0.0.1',
      };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'login:203.0.113.3',
        300,
        5,
      );
    });

    it('should fallback to request.ip when no proxy headers are present', async () => {
      const mockRequest = {
        headers: {},
        ip: '192.168.1.100',
      };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'login:192.168.1.100',
        300,
        5,
      );
    });

    it('should fallback to socket.remoteAddress when request.ip is not available', async () => {
      const mockRequest = {
        headers: {},
        socket: {
          remoteAddress: '192.168.1.200',
        },
      };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'login:192.168.1.200',
        300,
        5,
      );
    });

    it('should use "unknown" when no IP can be determined', async () => {
      const mockRequest = {
        headers: {},
      };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'login:unknown',
        300,
        5,
      );
    });

    it('should handle X-Forwarded-For with spaces around commas', async () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': '203.0.113.1 , 192.168.1.1 , 10.0.0.1',
        },
      };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'login:203.0.113.1',
        300,
        5,
      );
    });

    it('should allow request when Redis service throws an error', async () => {
      const mockRequest = { ip: '192.168.1.1', headers: {} };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should re-throw RateLimitExceededException even if caught in error handling', async () => {
      const mockRequest = { ip: '192.168.1.1', headers: {} };
      const context = createMockContext(mockRequest);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockRejectedValue(
        new RateLimitExceededException(300),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        RateLimitExceededException,
      );
    });

    it('should set correct remaining count when at limit', async () => {
      const mockRequest = { ip: '192.168.1.1', headers: {} };
      const mockResponse = { setHeader: jest.fn() };
      const context = createMockContext(mockRequest, mockResponse);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 5,
        isLimitExceeded: false,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '0',
      );
    });

    it('should not set negative remaining count', async () => {
      const mockRequest = { ip: '192.168.1.1', headers: {} };
      const mockResponse = { setHeader: jest.fn() };
      const context = createMockContext(mockRequest, mockResponse);

      reflector.get.mockReturnValue(mockRateLimitOptions);
      redisService.incrementRateLimit.mockResolvedValue({
        count: 7,
        isLimitExceeded: true,
        resetTime: Math.floor(Date.now() / 1000) + 300,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        RateLimitExceededException,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '0',
      );
    });
  });

  describe('reflector integration', () => {
    it('should get rate limit options from the correct decorator key', async () => {
      const mockRequest = { ip: '192.168.1.1' };
      const context = createMockContext(mockRequest);
      const mockHandler = jest.fn();

      (context.getHandler as jest.Mock).mockReturnValue(mockHandler);
      reflector.get.mockReturnValue(undefined);

      await guard.canActivate(context);

      expect(reflector.get).toHaveBeenCalledWith(RATE_LIMIT_KEY, mockHandler);
    });
  });
});
