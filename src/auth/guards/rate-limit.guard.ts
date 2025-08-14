import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Request, Response } from 'express';

import { RedisService } from '../../redis/redis.service';
import { RateLimitExceededException } from '../exceptions/auth.exceptions';
import { SecurityUtils } from '../utils/security.utils';

export interface RateLimitOptions {
  maxAttempts: number;
  windowSeconds: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
}

export const RATE_LIMIT_KEY = 'rate-limit';

/**
 * Decorator to set rate limiting options for a route
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Get rate limit options from decorator
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      // No rate limiting configured for this route
      return true;
    }

    const { maxAttempts, windowSeconds, keyPrefix } = rateLimitOptions;

    // Generate rate limit key based on IP address
    const clientIp = this.getClientIp(request);
    const rateLimitKey = SecurityUtils.generateRateLimitKey(
      keyPrefix,
      clientIp,
    );

    try {
      // Check current rate limit status
      const { count, isLimitExceeded, resetTime } =
        await this.redisService.incrementRateLimit(
          rateLimitKey,
          windowSeconds,
          maxAttempts,
        );

      this.logger.debug(
        `Rate limit check for ${rateLimitKey}: ${count}/${maxAttempts} (reset: ${resetTime})`,
      );

      if (isLimitExceeded) {
        const retryAfter = Math.ceil(resetTime - Date.now() / 1000);
        this.logger.warn(
          `Rate limit exceeded for ${rateLimitKey}: ${count}/${maxAttempts}`,
        );

        // Set rate limit headers
        const response = context.switchToHttp().getResponse<Response>();
        response.setHeader('X-RateLimit-Limit', maxAttempts.toString());
        response.setHeader(
          'X-RateLimit-Remaining',
          Math.max(0, maxAttempts - count).toString(),
        );
        response.setHeader('X-RateLimit-Reset', resetTime.toString());
        response.setHeader('Retry-After', retryAfter.toString());

        throw new RateLimitExceededException(retryAfter);
      }

      // Set rate limit headers for successful requests
      const response = context.switchToHttp().getResponse<Response>();
      response.setHeader('X-RateLimit-Limit', maxAttempts.toString());
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, maxAttempts - count).toString(),
      );
      response.setHeader('X-RateLimit-Reset', resetTime.toString());

      return true;
    } catch (error) {
      if (error instanceof RateLimitExceededException) {
        throw error;
      }

      this.logger.error(
        `Error checking rate limit for ${rateLimitKey}:`,
        error,
      );

      // Allow request to proceed if Redis is unavailable
      // This prevents rate limiting from breaking the application
      return true;
    }
  }

  private getClientIp(request: Request): string {
    // Check for IP in various headers (for proxy/load balancer scenarios)
    const headers = request.headers || {};
    const xForwardedFor = headers['x-forwarded-for'] as string;
    const xRealIp = headers['x-real-ip'] as string;
    const cfConnectingIp = headers['cf-connecting-ip'] as string;

    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return xForwardedFor.split(',')[0].trim();
    }

    if (xRealIp) {
      return xRealIp;
    }

    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // Fallback to connection remote address
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }
}
