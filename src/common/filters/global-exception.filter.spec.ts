import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Request, Response } from 'express';

import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: Partial<ArgumentsHost>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

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
    };

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('HTTP Exceptions', () => {
    it('should handle basic HTTP exception', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test error',
          error: 'Bad Request',
          timestamp: expect.any(String),
          path: '/v1/auth/signin',
          requestId: expect.any(String),
        }),
      );
    });

    it('should handle HTTP exception with custom response object', () => {
      const exception = new HttpException(
        {
          message: 'Custom error message',
          code: 'CUSTOM_ERROR',
          details: { field: 'username' },
        },
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Custom error message',
          error: 'Conflict',
          code: 'CUSTOM_ERROR',
          details: { field: 'username' },
          timestamp: expect.any(String),
          path: '/v1/auth/signin',
          requestId: expect.any(String),
        }),
      );
    });

    it('should handle authentication exception', () => {
      const exception = new HttpException(
        {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid credentials',
          error: 'Unauthorized',
          code: 'INVALID_CREDENTIALS',
        }),
      );
    });
  });

  describe('Prisma Exceptions', () => {
    it('should handle unique constraint violation (P2002)', () => {
      const exception = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['email'] },
        },
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'email already exists',
          error: 'Conflict',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          details: { field: 'email', constraint: ['email'] },
        }),
      );
    });

    it('should handle record not found (P2025)', () => {
      const exception = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '4.0.0',
      });

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Record not found',
          error: 'Not Found',
          code: 'RECORD_NOT_FOUND',
        }),
      );
    });

    it('should handle foreign key constraint violation (P2003)', () => {
      const exception = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '4.0.0',
        },
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid reference to related record',
          error: 'Bad Request',
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
        }),
      );
    });

    it('should handle unknown Prisma error', () => {
      const exception = new PrismaClientKnownRequestError(
        'Unknown database error',
        {
          code: 'P9999',
          clientVersion: '4.0.0',
        },
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Database operation failed',
          error: 'Internal Server Error',
          code: 'DATABASE_ERROR',
          details: { prismaCode: 'P9999' },
        }),
      );
    });
  });

  describe('Validation Exceptions', () => {
    it('should handle validation error', () => {
      const exception = {
        response: {
          statusCode: 400,
          message: [
            'username must be longer than 3 characters',
            'email must be a valid email',
          ],
        },
      };

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
          code: 'VALIDATION_ERROR',
          details: [
            'username must be longer than 3 characters',
            'email must be a valid email',
          ],
        }),
      );
    });

    it('should handle single validation error message', () => {
      const exception = {
        response: {
          statusCode: 400,
          message: ['Invalid input'], // Should be an array for validation detection
        },
      };

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
          code: 'VALIDATION_ERROR',
          details: ['Invalid input'],
        }),
      );
    });
  });

  describe('Unknown Exceptions', () => {
    it('should handle unknown error', () => {
      const exception = new Error('Unknown error');

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          error: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
          requestId: expect.any(String),
        }),
      );
    });

    it('should handle non-Error objects', () => {
      const exception = 'String error';

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          error: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        }),
      );
    });
  });

  describe('Error Status Code Mapping', () => {
    const statusCodes = [
      { code: HttpStatus.BAD_REQUEST, name: 'Bad Request' },
      { code: HttpStatus.UNAUTHORIZED, name: 'Unauthorized' },
      { code: HttpStatus.FORBIDDEN, name: 'Forbidden' },
      { code: HttpStatus.NOT_FOUND, name: 'Not Found' },
      { code: HttpStatus.CONFLICT, name: 'Conflict' },
      { code: HttpStatus.TOO_MANY_REQUESTS, name: 'Too Many Requests' },
      { code: HttpStatus.INTERNAL_SERVER_ERROR, name: 'Internal Server Error' },
      { code: 418, name: 'Error' }, // Unknown status code
    ];

    statusCodes.forEach(({ code, name }) => {
      it(`should map status code ${code} to "${name}"`, () => {
        const exception = new HttpException('Test error', code);

        filter.catch(exception, mockArgumentsHost as ArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: name,
          }),
        );
      });
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const exception1 = new HttpException('Error 1', HttpStatus.BAD_REQUEST);
      const exception2 = new HttpException('Error 2', HttpStatus.BAD_REQUEST);

      filter.catch(exception1, mockArgumentsHost as ArgumentsHost);
      const firstCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

      filter.catch(exception2, mockArgumentsHost as ArgumentsHost);
      const secondCall = (mockResponse.json as jest.Mock).mock.calls[1][0];

      expect(firstCall.requestId).toBeDefined();
      expect(secondCall.requestId).toBeDefined();
      expect(firstCall.requestId).not.toBe(secondCall.requestId);
      expect(firstCall.requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
    });
  });

  describe('Request Context', () => {
    it('should include request context in error response', () => {
      mockRequest.url = '/v1/users/profile';
      mockRequest.method = 'PUT';
      mockRequest.ip = '192.168.1.1';
      mockRequest.headers = { 'user-agent': 'Mozilla/5.0' };

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/v1/users/profile',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle missing user-agent header', () => {
      mockRequest.headers = {};

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test error',
        }),
      );
    });
  });
});
