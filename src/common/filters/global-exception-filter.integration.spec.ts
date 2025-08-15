import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Request, Response } from 'express';

import { MonitoringService } from '../services/monitoring.service';

import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter Integration', () => {
  let filter: GlobalExceptionFilter;
  let monitoringService: MonitoringService;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: Partial<ArgumentsHost>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter, MonitoringService],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    monitoringService = module.get<MonitoringService>(MonitoringService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/v1/auth/signin',
      method: 'POST',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
      user: { id: 'user_123' },
    } as any;

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    // Reset monitoring service metrics
    monitoringService.resetMetrics();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Integration with MonitoringService', () => {
    it('should log error to monitoring service when handling HTTP exception', () => {
      const logErrorSpy = jest.spyOn(monitoringService, 'logError');
      const exception = new HttpException(
        {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
          requestId: expect.any(String),
          errorCode: 'INVALID_CREDENTIALS',
          statusCode: 401,
          message: 'Invalid credentials',
          endpoint: '/v1/auth/signin',
          method: 'POST',
          userAgent: 'test-agent',
          ip: '127.0.0.1',
          userId: 'user_123',
          stack: expect.any(String),
        }),
      );
    });

    it('should log error with stack trace for server errors', () => {
      const logErrorSpy = jest.spyOn(monitoringService, 'logError');
      const exception = new Error('Database connection failed');

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          stack: expect.stringContaining('Database connection failed'),
        }),
      );
    });

    it('should update monitoring service metrics', () => {
      const exception = new HttpException(
        {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      const metrics = monitoringService.getErrorMetrics();
      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorsByType['RATE_LIMIT_EXCEEDED']).toBe(1);
      expect(metrics.errorsByEndpoint['POST /v1/auth/signin']).toBe(1);
    });

    it('should handle multiple errors and update metrics correctly', () => {
      const exception1 = new HttpException('Error 1', HttpStatus.BAD_REQUEST);
      const exception2 = new HttpException('Error 2', HttpStatus.UNAUTHORIZED);
      const exception3 = new HttpException('Error 3', HttpStatus.BAD_REQUEST);

      filter.catch(exception1, mockArgumentsHost as ArgumentsHost);
      filter.catch(exception2, mockArgumentsHost as ArgumentsHost);
      filter.catch(exception3, mockArgumentsHost as ArgumentsHost);

      const metrics = monitoringService.getErrorMetrics();
      expect(metrics.errorCount).toBe(3);
      expect(metrics.errorsByEndpoint['POST /v1/auth/signin']).toBe(3);
    });

    it('should work without monitoring service (graceful degradation)', () => {
      // Create filter without monitoring service
      const filterWithoutMonitoring = new GlobalExceptionFilter();
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      // Should not throw error
      expect(() => {
        filterWithoutMonitoring.catch(
          exception,
          mockArgumentsHost as ArgumentsHost,
        );
      }).not.toThrow();

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test error',
        }),
      );
    });

    it('should handle request without user context', () => {
      const logErrorSpy = jest.spyOn(monitoringService, 'logError');
      mockRequest.user = undefined;

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it('should handle request without IP address', () => {
      const logErrorSpy = jest.spyOn(monitoringService, 'logError');
      mockRequest.ip = undefined;

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: undefined,
        }),
      );
    });

    it('should handle request without user-agent header', () => {
      const logErrorSpy = jest.spyOn(monitoringService, 'logError');
      mockRequest.headers = {};

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: undefined,
        }),
      );
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should maintain consistent error response format with monitoring integration', () => {
      const exception = new HttpException(
        {
          message: 'Username not available',
          code: 'USERNAME_UNAVAILABLE',
          suggestions: ['user123', 'user456'],
        },
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Username not available',
          error: 'Conflict',
          code: 'USERNAME_UNAVAILABLE',
          details: ['user123', 'user456'],
          timestamp: expect.any(String),
          path: '/v1/auth/signin',
          requestId: expect.any(String),
        }),
      );
    });

    it('should include all required fields in error response', () => {
      const exception = new HttpException(
        'Simple error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

      expect(responseCall).toHaveProperty('statusCode');
      expect(responseCall).toHaveProperty('message');
      expect(responseCall).toHaveProperty('error');
      expect(responseCall).toHaveProperty('timestamp');
      expect(responseCall).toHaveProperty('path');
      expect(responseCall).toHaveProperty('requestId');

      // Verify timestamp is valid ISO string
      expect(() => new Date(responseCall.timestamp)).not.toThrow();

      // Verify request ID format
      expect(responseCall.requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
    });
  });
});
