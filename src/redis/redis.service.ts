import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connected');
    });

    this.client.on('disconnect', () => {
      this.logger.warn('Redis Client Disconnected');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('Redis Client Disconnected');
    }
  }

  /**
   * Session Management Methods
   */

  /**
   * Store session data in Redis
   * @param sessionId - Unique session identifier
   * @param sessionData - Session data to store
   * @param ttlSeconds - Time to live in seconds
   */
  async setSession(
    sessionId: string,
    sessionData: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.client.setEx(key, ttlSeconds, JSON.stringify(sessionData));
    this.logger.debug(`Session stored: ${sessionId}`);
  }

  /**
   * Retrieve session data from Redis
   * @param sessionId - Session identifier
   * @returns Session data or null if not found
   */
  async getSession(sessionId: string): Promise<unknown> {
    const key = this.getSessionKey(sessionId);
    const data = await this.client.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(
        `Failed to parse session data for ${sessionId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Delete session from Redis
   * @param sessionId - Session identifier
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.client.del(key);
    this.logger.debug(`Session deleted: ${sessionId}`);
  }

  /**
   * Delete all sessions for a user
   * @param userId - User identifier
   */
  async deleteUserSessions(userId: string): Promise<void> {
    const pattern = this.getUserSessionPattern(userId);
    const keys = await this.client.keys(pattern);

    if (keys.length > 0) {
      await this.client.del(keys);
      this.logger.debug(`Deleted ${keys.length} sessions for user: ${userId}`);
    }
  }

  /**
   * Get all session keys for a user
   * @param userId - User identifier
   * @returns Array of session IDs
   */
  async getUserSessionIds(userId: string): Promise<string[]> {
    const pattern = this.getUserSessionPattern(userId);
    const keys = await this.client.keys(pattern);

    // Extract session IDs from keys
    return keys.map((key) => key.replace(`session:${userId}:`, ''));
  }

  /**
   * Update session TTL
   * @param sessionId - Session identifier
   * @param ttlSeconds - New TTL in seconds
   */
  async refreshSession(
    sessionId: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const key = this.getSessionKey(sessionId);
    const result = await this.client.expire(key, ttlSeconds);

    if (result === 1) {
      this.logger.debug(`Session refreshed: ${sessionId}`);
    }

    return result === 1;
  }

  /**
   * Rate Limiting Methods
   */

  /**
   * Increment rate limit counter
   * @param key - Rate limit key (e.g., IP address, user ID)
   * @param windowSeconds - Time window in seconds
   * @param maxAttempts - Maximum attempts allowed
   * @returns Object with current count and whether limit is exceeded
   */
  async incrementRateLimit(
    key: string,
    windowSeconds: number,
    maxAttempts: number,
  ): Promise<{ count: number; isLimitExceeded: boolean; resetTime: number }> {
    const rateLimitKey = this.getRateLimitKey(key);

    // Use pipeline for atomic operations
    const pipeline = this.client.multi();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, windowSeconds);
    pipeline.ttl(rateLimitKey);

    const results = await pipeline.exec();
    const count = results[0] as unknown as number;
    const ttl = results[2] as unknown as number;

    const resetTime = Date.now() + ttl * 1000;
    const isLimitExceeded = count > maxAttempts;

    if (isLimitExceeded) {
      this.logger.warn(`Rate limit exceeded for key: ${key}, count: ${count}`);
    }

    return {
      count,
      isLimitExceeded,
      resetTime,
    };
  }

  /**
   * Get current rate limit count
   * @param key - Rate limit key
   * @returns Current count and TTL
   */
  async getRateLimit(key: string): Promise<{ count: number; ttl: number }> {
    const rateLimitKey = this.getRateLimitKey(key);

    const pipeline = this.client.multi();
    pipeline.get(rateLimitKey);
    pipeline.ttl(rateLimitKey);

    const results = await pipeline.exec();
    const countStr = results[0] as unknown as string;
    const ttl = results[1] as unknown as number;

    return {
      count: countStr ? parseInt(countStr, 10) : 0,
      ttl,
    };
  }

  /**
   * Reset rate limit counter
   * @param key - Rate limit key
   */
  async resetRateLimit(key: string): Promise<void> {
    const rateLimitKey = this.getRateLimitKey(key);
    await this.client.del(rateLimitKey);
    this.logger.debug(`Rate limit reset for key: ${key}`);
  }

  /**
   * Generic Redis Operations
   */

  /**
   * Set a key-value pair with optional TTL
   * @param key - Redis key
   * @param value - Value to store
   * @param ttlSeconds - Optional TTL in seconds
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get value by key
   * @param key - Redis key
   * @returns Value or null if not found
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Delete key
   * @param key - Redis key
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if key exists
   * @param key - Redis key
   * @returns True if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Private helper methods
   */

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private getUserSessionPattern(userId: string): string {
    return `session:${userId}:*`;
  }

  private getRateLimitKey(key: string): string {
    return `rate_limit:${key}`;
  }

  /**
   * Health check method
   */
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  /**
   * Get Redis client for advanced operations (use with caution)
   */
  getClient(): RedisClientType {
    return this.client;
  }
}
