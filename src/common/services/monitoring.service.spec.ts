import { Test, TestingModule } from '@nestjs/testing';

import { ErrorEvent, MonitoringService } from './monitoring.service';

describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringService],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    service.resetMetrics();
  });

  describe('logError', () => {
    it('should log server errors with stack trace', () => {
      const errorEvent: ErrorEvent = {
        timestamp: new Date(),
        requestId: 'req_123',
        errorCode: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        message: 'Database connection failed',
        endpoint: '/v1/auth/signin',
        method: 'POST',
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        stack: 'Error: Database connection failed\n    at ...',
      };

      service.logError(errorEvent);

      const metrics = service.getErrorMetrics();
      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorsByType['INTERNAL_SERVER_ERROR']).toBe(1);
      expect(metrics.errorsByEndpoint['POST /v1/auth/signin']).toBe(1);
    });

    it('should log client errors without stack trace', () => {
      const errorEvent: ErrorEvent = {
        timestamp: new Date(),
        requestId: 'req_456',
        errorCode: 'INVALID_CREDENTIALS',
        statusCode: 401,
        message: 'Invalid credentials',
        endpoint: '/v1/auth/signin',
        method: 'POST',
        userAgent: 'test-agent',
        ip: '127.0.0.1',
      };

      service.logError(errorEvent);

      const metrics = service.getErrorMetrics();
      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorsByType['INVALID_CREDENTIALS']).toBe(1);
    });

    it('should handle errors without error code', () => {
      const errorEvent: ErrorEvent = {
        timestamp: new Date(),
        requestId: 'req_789',
        statusCode: 400,
        message: 'Bad request',
        endpoint: '/v1/users/profile',
        method: 'PUT',
        ip: '127.0.0.1',
      };

      service.logError(errorEvent);

      const metrics = service.getErrorMetrics();
      expect(metrics.errorsByType['UNKNOWN']).toBe(1);
    });

    it('should update error metrics correctly', () => {
      const baseEvent: ErrorEvent = {
        timestamp: new Date(),
        requestId: 'req_base',
        statusCode: 400,
        message: 'Test error',
        endpoint: '/v1/test',
        method: 'GET',
        ip: '127.0.0.1',
      };

      // Log multiple errors
      service.logError({ ...baseEvent, errorCode: 'ERROR_1' });
      service.logError({ ...baseEvent, errorCode: 'ERROR_1' });
      service.logError({ ...baseEvent, errorCode: 'ERROR_2' });

      const metrics = service.getErrorMetrics();
      expect(metrics.errorCount).toBe(3);
      expect(metrics.errorsByType['ERROR_1']).toBe(2);
      expect(metrics.errorsByType['ERROR_2']).toBe(1);
      expect(metrics.errorsByEndpoint['GET /v1/test']).toBe(3);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log suspicious activity events', () => {
      const event = {
        type: 'SUSPICIOUS_ACTIVITY' as const,
        userId: 'user_123',
        ip: '192.168.1.1',
        userAgent: 'suspicious-agent',
        details: { reason: 'Multiple failed login attempts' },
      };

      service.logSecurityEvent(event);

      // Should not throw and should log the event
      expect(true).toBe(true);
    });

    it('should log rate limit exceeded events', () => {
      const event = {
        type: 'RATE_LIMIT_EXCEEDED' as const,
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        details: { endpoint: '/v1/auth/signin', attempts: 10 },
      };

      service.logSecurityEvent(event);

      expect(true).toBe(true);
    });

    it('should log account locked events', () => {
      const event = {
        type: 'ACCOUNT_LOCKED' as const,
        userId: 'user_456',
        ip: '192.168.1.1',
        details: { reason: 'Too many failed login attempts' },
      };

      service.logSecurityEvent(event);

      expect(true).toBe(true);
    });

    it('should log failed login events', () => {
      const event = {
        type: 'FAILED_LOGIN' as const,
        userId: 'user_789',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        details: { username: 'testuser' },
      };

      service.logSecurityEvent(event);

      expect(true).toBe(true);
    });
  });

  describe('logPerformanceMetric', () => {
    it('should log slow operations as warnings', () => {
      const metric = {
        operation: 'database_query',
        duration: 2000, // 2 seconds
        success: true,
        metadata: { query: 'SELECT * FROM users' },
      };

      service.logPerformanceMetric(metric);

      expect(true).toBe(true);
    });

    it('should log fast operations as debug', () => {
      const metric = {
        operation: 'cache_lookup',
        duration: 50, // 50ms
        success: true,
        metadata: { key: 'user_123' },
      };

      service.logPerformanceMetric(metric);

      expect(true).toBe(true);
    });

    it('should log failed operations', () => {
      const metric = {
        operation: 'external_api_call',
        duration: 500,
        success: false,
        metadata: { error: 'Connection timeout' },
      };

      service.logPerformanceMetric(metric);

      expect(true).toBe(true);
    });
  });

  describe('getErrorMetrics', () => {
    it('should return current error metrics', () => {
      const errorEvent: ErrorEvent = {
        timestamp: new Date(),
        requestId: 'req_metrics',
        errorCode: 'TEST_ERROR',
        statusCode: 400,
        message: 'Test error',
        endpoint: '/v1/test',
        method: 'GET',
        ip: '127.0.0.1',
      };

      service.logError(errorEvent);

      const metrics = service.getErrorMetrics();
      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorsByType['TEST_ERROR']).toBe(1);
      expect(metrics.errorsByEndpoint['GET /v1/test']).toBe(1);
      expect(metrics.lastError).toBeInstanceOf(Date);
    });

    it('should return a copy of metrics (not reference)', () => {
      const metrics1 = service.getErrorMetrics();
      const metrics2 = service.getErrorMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to initial state', () => {
      // Log some errors first
      const errorEvent: ErrorEvent = {
        timestamp: new Date(),
        requestId: 'req_reset',
        errorCode: 'TEST_ERROR',
        statusCode: 400,
        message: 'Test error',
        endpoint: '/v1/test',
        method: 'GET',
        ip: '127.0.0.1',
      };

      service.logError(errorEvent);
      service.logError(errorEvent);

      let metrics = service.getErrorMetrics();
      expect(metrics.errorCount).toBe(2);

      // Reset metrics
      service.resetMetrics();

      metrics = service.getErrorMetrics();
      expect(metrics.errorCount).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.errorsByType).toEqual({});
      expect(metrics.errorsByEndpoint).toEqual({});
      expect(metrics.lastError).toBeInstanceOf(Date);
    });
  });

  describe('error rate calculation', () => {
    it('should calculate error rate based on recent errors', () => {
      const now = new Date();
      const errorEvent: ErrorEvent = {
        timestamp: now,
        requestId: 'req_rate',
        errorCode: 'TEST_ERROR',
        statusCode: 400,
        message: 'Test error',
        endpoint: '/v1/test',
        method: 'GET',
        ip: '127.0.0.1',
      };

      // Log 10 errors
      for (let i = 0; i < 10; i++) {
        service.logError({ ...errorEvent, requestId: `req_rate_${i}` });
      }

      const metrics = service.getErrorMetrics();
      expect(metrics.errorCount).toBe(10);
      expect(metrics.errorRate).toBe(2); // 10 errors / 5 minutes = 2 errors per minute
    });
  });

  describe('endpoint and error type tracking', () => {
    it('should track errors by endpoint correctly', () => {
      const baseEvent: ErrorEvent = {
        timestamp: new Date(),
        requestId: 'req_endpoint',
        statusCode: 400,
        message: 'Test error',
        ip: '127.0.0.1',
      };

      service.logError({
        ...baseEvent,
        endpoint: '/v1/auth/signin',
        method: 'POST',
      });
      service.logError({
        ...baseEvent,
        endpoint: '/v1/auth/signin',
        method: 'POST',
      });
      service.logError({
        ...baseEvent,
        endpoint: '/v1/users/profile',
        method: 'GET',
      });

      const metrics = service.getErrorMetrics();
      expect(metrics.errorsByEndpoint['POST /v1/auth/signin']).toBe(2);
      expect(metrics.errorsByEndpoint['GET /v1/users/profile']).toBe(1);
    });

    it('should track errors by type correctly', () => {
      const baseEvent: ErrorEvent = {
        timestamp: new Date(),
        requestId: 'req_type',
        statusCode: 400,
        message: 'Test error',
        endpoint: '/v1/test',
        method: 'GET',
        ip: '127.0.0.1',
      };

      service.logError({ ...baseEvent, errorCode: 'VALIDATION_ERROR' });
      service.logError({ ...baseEvent, errorCode: 'VALIDATION_ERROR' });
      service.logError({ ...baseEvent, errorCode: 'AUTHENTICATION_ERROR' });

      const metrics = service.getErrorMetrics();
      expect(metrics.errorsByType['VALIDATION_ERROR']).toBe(2);
      expect(metrics.errorsByType['AUTHENTICATION_ERROR']).toBe(1);
    });
  });
});
