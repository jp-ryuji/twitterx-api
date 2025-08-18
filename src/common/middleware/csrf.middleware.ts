import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { RedisService } from '../../redis/redis.service';
import { MonitoringService } from '../services/monitoring.service';

// Define a custom request type
interface CustomRequest extends Request {
  user?: { id: string };
  body: {
    _csrf?: string;
  };
  query: {
    _csrf?: string;
  };
}

export interface CsrfToken {
  token: string;
  createdAt: number;
  userId?: string;
}

/**
 * @class CsrfMiddleware
 * @description Implements double-submit cookie pattern for CSRF protection using Redis.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    if (
      req.method === 'GET' ||
      req.method === 'HEAD' ||
      req.method === 'OPTIONS'
    ) {
      if (req.method === 'GET') {
        await this.setCsrfTokenCookie(req, res);
      }
      return next();
    }

    const token = this.extractToken(req);
    const cookieToken = req.cookies?.['csrf-token'] as string;

    if (!token || !cookieToken) {
      this.logAndSendError(
        req,
        res,
        'CSRF_TOKEN_MISSING',
        'CSRF token missing',
      );
      return;
    }

    if (token !== cookieToken) {
      this.logAndSendError(
        req,
        res,
        'CSRF_TOKEN_MISMATCH',
        'CSRF token mismatch',
      );
      return;
    }

    const isValid = await this.validateToken(token, req);
    if (!isValid) {
      this.logAndSendError(
        req,
        res,
        'INVALID_CSRF_TOKEN',
        'Invalid or expired CSRF token',
      );
      return;
    }

    next();
  }

  private logAndSendError(
    req: CustomRequest,
    res: Response,
    type: string,
    message: string,
  ) {
    this.monitoringService.logSecurityEvent({
      type,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      userId: req.user?.id,
      details: {
        url: req.url,
        method: req.method,
      },
    });

    res.status(401).json({
      statusCode: 401,
      message,
      error: 'Unauthorized',
    });
  }

  private async setCsrfTokenCookie(
    req: CustomRequest,
    res: Response,
  ): Promise<void> {
    const existingToken = req.cookies?.['csrf-token'] as string;
    if (existingToken) {
      const isValid = await this.validateToken(existingToken, req);
      if (isValid) {
        return;
      }
    }

    const token = uuidv4();
    const ttlSeconds = 3600;
    const key = this.getTokenKey(token);

    const tokenData: CsrfToken = {
      token,
      createdAt: Date.now(),
      userId: req.user?.id,
    };

    await this.redisService.set(key, JSON.stringify(tokenData), ttlSeconds);

    res.cookie('csrf-token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ttlSeconds * 1000,
    });
  }

  private extractToken(req: CustomRequest): string | null {
    const headerToken = req.headers['x-csrf-token'];
    if (typeof headerToken === 'string') {
      return headerToken;
    }

    if (req.body?._csrf) {
      return req.body._csrf;
    }

    if (req.query?._csrf) {
      return req.query._csrf;
    }

    return null;
  }

  private async validateToken(
    token: string,
    req: CustomRequest,
  ): Promise<boolean> {
    try {
      const key = this.getTokenKey(token);
      const tokenDataStr = await this.redisService.get(key);

      if (!tokenDataStr) {
        return false;
      }

      const tokenData = JSON.parse(tokenDataStr) as CsrfToken;
      const oneHour = 3600 * 1000;
      if (Date.now() - tokenData.createdAt > oneHour) {
        await this.redisService.delete(key);
        return false;
      }

      if (tokenData.userId && req.user?.id) {
        if (tokenData.userId !== req.user.id) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private getTokenKey(token: string): string {
    return `csrf:${token}`;
  }

  private getClientIp(req: Request): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
