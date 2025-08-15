import { Injectable, Logger } from '@nestjs/common';

export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  lastError: Date;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
}

export interface ErrorEvent {
  timestamp: Date;
  requestId: string;
  errorCode?: string;
  statusCode: number;
  message: string;
  endpoint: string;
  method: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  stack?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private errorMetrics: ErrorMetrics = {
    errorCount: 0,
    errorRate: 0,
    lastError: new Date(),
    errorsByType: {},
    errorsByEndpoint: {},
  };

  /**
   * Log an error event for monitoring and analytics
   */
  logError(errorEvent: ErrorEvent): void {
    // Update metrics
    this.updateErrorMetrics(errorEvent);

    // Log based on severity
    if (errorEvent.statusCode >= 500) {
      this.logger.error(
        `Server Error [${errorEvent.requestId}]: ${errorEvent.message}`,
        {
          ...errorEvent,
          stack: errorEvent.stack,
        },
      );
    } else if (errorEvent.statusCode >= 400) {
      this.logger.warn(
        `Client Error [${errorEvent.requestId}]: ${errorEvent.message}`,
        {
          ...errorEvent,
          stack: undefined, // Don't log stack for client errors
        },
      );
    }

    // Send to external monitoring services (if configured)
    this.sendToExternalMonitoring(errorEvent);
  }

  /**
   * Log a security event for monitoring
   */
  logSecurityEvent(event: {
    type:
      | 'SUSPICIOUS_ACTIVITY'
      | 'RATE_LIMIT_EXCEEDED'
      | 'ACCOUNT_LOCKED'
      | 'FAILED_LOGIN';
    userId?: string;
    ip: string;
    userAgent?: string;
    details?: unknown;
  }): void {
    this.logger.warn(`Security Event: ${event.type}`, {
      timestamp: new Date().toISOString(),
      ...event,
    });

    // Send to security monitoring system
    this.sendSecurityAlert(event);
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetric(metric: {
    operation: string;
    duration: number;
    success: boolean;
    metadata?: any;
  }): void {
    if (metric.duration > 1000) {
      // Log slow operations
      this.logger.warn(
        `Slow Operation: ${metric.operation} took ${metric.duration}ms`,
        metric,
      );
    } else {
      this.logger.debug(
        `Performance: ${metric.operation} took ${metric.duration}ms`,
        metric,
      );
    }
  }

  /**
   * Get current error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  /**
   * Reset error metrics (useful for testing)
   */
  resetMetrics(): void {
    this.errorMetrics = {
      errorCount: 0,
      errorRate: 0,
      lastError: new Date(),
      errorsByType: {},
      errorsByEndpoint: {},
    };
  }

  private updateErrorMetrics(errorEvent: ErrorEvent): void {
    this.errorMetrics.errorCount++;
    this.errorMetrics.lastError = errorEvent.timestamp;

    // Update error count by type
    const errorType = errorEvent.errorCode || 'UNKNOWN';
    this.errorMetrics.errorsByType[errorType] =
      (this.errorMetrics.errorsByType[errorType] || 0) + 1;

    // Update error count by endpoint
    const endpoint = `${errorEvent.method} ${errorEvent.endpoint}`;
    this.errorMetrics.errorsByEndpoint[endpoint] =
      (this.errorMetrics.errorsByEndpoint[endpoint] || 0) + 1;

    // Calculate error rate (errors per minute over last 5 minutes)
    // This is a simplified calculation - in production, you'd use a sliding window
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (errorEvent.timestamp > fiveMinutesAgo) {
      this.errorMetrics.errorRate = this.errorMetrics.errorCount / 5; // errors per minute
    }
  }

  private sendToExternalMonitoring(errorEvent: ErrorEvent): void {
    // In a real application, you would send this to external monitoring services
    // such as Sentry, DataDog, New Relic, etc.

    // Example integrations:
    // - Sentry.captureException(error)
    // - DataDog.increment('api.errors', 1, { endpoint: errorEvent.endpoint })
    // - NewRelic.recordCustomEvent('ApiError', errorEvent)

    this.logger.debug('Error event would be sent to external monitoring', {
      service: 'external-monitoring',
      event: errorEvent,
    });
  }

  private sendSecurityAlert(event: {
    type: string;
    userId?: string;
    ip: string;
    userAgent?: string;
    details?: unknown;
  }): void {
    // In a real application, you would send security alerts to:
    // - Security Information and Event Management (SIEM) systems
    // - Slack/Teams notifications for critical events
    // - Email alerts for administrators

    this.logger.debug('Security event would trigger alert', {
      service: 'security-monitoring',
      event,
    });
  }
}
