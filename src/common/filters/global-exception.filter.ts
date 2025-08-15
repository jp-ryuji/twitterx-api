import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Request, Response } from 'express';

import { MonitoringService } from '../services/monitoring.service';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  code?: string;
  details?: any;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    @Optional()
    @Inject(MonitoringService)
    private readonly monitoringService?: MonitoringService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error with appropriate level
    this.logError(exception, request, errorResponse);

    // Send to monitoring service if available
    if (this.monitoringService) {
      this.monitoringService.logError({
        timestamp: new Date(errorResponse.timestamp),
        requestId: errorResponse.requestId!,
        errorCode: errorResponse.code,
        statusCode: errorResponse.statusCode,
        message: errorResponse.message,
        endpoint: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        userId: (request as Request & { user?: { id: string } }).user?.id,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const requestId = this.generateRequestId();

    // Handle HTTP exceptions (including our custom ones)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as {
          message?: string;
          code?: string;
          details?: unknown;
          suggestions?: unknown;
          errors?: unknown;
        };
        return {
          statusCode: status,
          message: responseObj.message || exception.message,
          error: this.getErrorName(status),
          timestamp,
          path,
          code: responseObj.code,
          details:
            responseObj.details ||
            responseObj.suggestions ||
            responseObj.errors,
          requestId,
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        error: this.getErrorName(status),
        timestamp,
        path,
        requestId,
      };
    }

    // Handle Prisma errors
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path, requestId);
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception, timestamp, path, requestId);
    }

    // Handle unknown errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp,
      path,
      code: 'INTERNAL_SERVER_ERROR',
      requestId,
    };
  }

  private handlePrismaError(
    exception: PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
    requestId: string,
  ): ErrorResponse {
    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = exception.meta?.target as string[];
        const field = target?.[0] || 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `${field} already exists`,
          error: 'Conflict',
          timestamp,
          path,
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          details: { field, constraint: target },
          requestId,
        };
      }

      case 'P2025': {
        // Record not found
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
          timestamp,
          path,
          code: 'RECORD_NOT_FOUND',
          requestId,
        };
      }

      case 'P2003': {
        // Foreign key constraint violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related record',
          error: 'Bad Request',
          timestamp,
          path,
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
          requestId,
        };
      }

      default: {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'Internal Server Error',
          timestamp,
          path,
          code: 'DATABASE_ERROR',
          details: { prismaCode: exception.code },
          requestId,
        };
      }
    }
  }

  private handleValidationError(
    exception: {
      response?: { statusCode?: number; message?: string | string[] };
    },
    timestamp: string,
    path: string,
    requestId: string,
  ): ErrorResponse {
    const validationErrors = exception.response?.message || [];
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      error: 'Bad Request',
      timestamp,
      path,
      code: 'VALIDATION_ERROR',
      details: Array.isArray(validationErrors)
        ? validationErrors
        : [validationErrors],
      requestId,
    };
  }

  private isValidationError(
    exception: unknown,
  ): exception is { response: { statusCode: number; message: string[] } } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'response' in exception &&
      typeof (exception as { response?: unknown }).response === 'object' &&
      (exception as { response: { statusCode?: unknown; message?: unknown } })
        .response !== null &&
      (exception as { response: { statusCode?: unknown; message?: unknown } })
        .response.statusCode === 400 &&
      Array.isArray(
        (exception as { response: { statusCode?: unknown; message?: unknown } })
          .response.message,
      )
    );
  }

  private getErrorName(statusCode: number): string {
    switch (statusCode as HttpStatus) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return 'Error';
    }
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    const logContext = {
      requestId: errorResponse.requestId,
      method,
      url,
      ip,
      userAgent,
      statusCode: errorResponse.statusCode,
      errorCode: errorResponse.code,
    };

    // Log based on error severity
    if (errorResponse.statusCode >= 500) {
      // Server errors - log as error with full stack trace
      this.logger.error(
        `Server Error: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : String(exception),
        logContext,
      );
    } else if (errorResponse.statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(`Client Error: ${errorResponse.message}`, logContext);
    } else {
      // Other errors - log as debug
      this.logger.debug(`Error: ${errorResponse.message}`, logContext);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
