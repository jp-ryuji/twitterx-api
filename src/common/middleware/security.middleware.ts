import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

import { Request, Response, NextFunction } from 'express';

import { RedisService } from '../../redis/redis.service';
import { MonitoringService } from '../services/monitoring.service';

// Define a custom request type
interface CustomRequest extends Request {
  user?: { id: string };
}

/**
 * @class SecurityMiddleware
 * @description Implements security checks for suspicious patterns and brute force attempts.
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const suspiciousPattern = this.checkSuspiciousPatterns(req);
    if (suspiciousPattern) {
      this.monitoringService.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        ip: this.getClientIp(req),
        userAgent: req.headers['user-agent'] as string,
        userId: req.user?.id,
        details: {
          url: req.url,
          method: req.method,
          suspiciousPattern,
        },
      });

      this.logger.warn('Suspicious activity detected', {
        pattern: suspiciousPattern,
        url: req.url,
        ip: this.getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
    }

    await this.checkBruteForce(req);

    next();
  }

  private checkSuspiciousPatterns(req: Request): string | null {
    const userAgent = req.headers['user-agent'] || '';
    const url = req.url;

    const suspiciousPatterns = [
      {
        pattern:
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        name: 'SQL_INJECTION_ATTEMPT',
      },
      {
        pattern: /(<script|javascript:|onerror=|onload=)/i,
        name: 'XSS_ATTEMPT',
      },
      { pattern: /\.\.\/|\.\\/g, name: 'PATH_TRAVERSAL_ATTEMPT' },
      {
        pattern: /(\/etc\/passwd|\/etc\/shadow|c:\\windows)/i,
        name: 'SYSTEM_FILE_ACCESS_ATTEMPT',
      },
    ];

    for (const { pattern, name } of suspiciousPatterns) {
      if (pattern.test(url)) {
        return name;
      }
    }

    const automatedTools = [
      'sqlmap',
      'nikto',
      'nessus',
      'burp',
      'zaproxy',
      'gobuster',
      'dirbuster',
    ];

    for (const tool of automatedTools) {
      if (userAgent.toLowerCase().includes(tool)) {
        return 'AUTOMATED_TOOL_DETECTED';
      }
    }

    return null;
  }

  private async checkBruteForce(req: Request): Promise<void> {
    const ip = this.getClientIp(req);
    const key = `bruteforce:${ip}:${req.method}:${req.url}`;

    try {
      const { isLimitExceeded, count } =
        await this.redisService.incrementRateLimit(
          key,
          300, // 5 minute window
          50, // Max 50 requests per 5 minutes
        );

      if (isLimitExceeded) {
        this.monitoringService.logSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          ip,
          userAgent: req.headers['user-agent'] as string,
          userId: (req as CustomRequest).user?.id,
          details: {
            url: req.url,
            method: req.method,
            count,
          },
        });

        this.logger.warn('Brute force attempt detected', {
          ip,
          url: req.url,
          count,
        });
      }
    } catch {
      this.logger.error('Failed to check brute force attempts');
    }
  }

  private getClientIp(req: Request): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
