import { Injectable, Logger } from '@nestjs/common';

import { Session } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

import { JwtService, TokenPair } from './jwt.service';

export interface SessionData {
  userId: string;
  username: string;
  email?: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface CreateSessionOptions {
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  rememberMe?: boolean;
  isMobile?: boolean;
}

export interface SessionInfo {
  sessionId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Create a new session with JWT tokens
   */
  async createSession(
    userId: string,
    username: string,
    email?: string,
    options: CreateSessionOptions = {},
  ): Promise<{
    session: Session;
    tokens: TokenPair;
  }> {
    const {
      deviceInfo,
      ipAddress,
      userAgent,
      rememberMe = false,
      isMobile = false,
    } = options;

    // Calculate session expiration based on device type and remember me setting
    const expirationDays = this.getSessionExpirationDays(isMobile, rememberMe);
    const expiresAt = new Date(
      Date.now() + expirationDays * 24 * 60 * 60 * 1000,
    );

    // Create session in database
    const session = await this.prisma.session.create({
      data: {
        userId,
        sessionToken: this.generateSessionToken(),
        deviceInfo,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokens(
      userId,
      username,
      email,
      session.id,
    );

    // Store session data in Redis for fast access
    const sessionData: SessionData = {
      userId,
      username,
      email,
      deviceInfo,
      ipAddress,
      userAgent,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
    };

    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await this.redisService.setSession(
      session.sessionToken,
      sessionData,
      ttlSeconds,
    );

    this.logger.log(
      `Session created for user: ${username} (${userId}), session: ${session.id}`,
    );

    return { session, tokens };
  }

  /**
   * Validate session by session token
   */
  async validateSession(sessionToken: string): Promise<SessionData | null> {
    // First check Redis for fast access
    const redisData = await this.redisService.getSession(sessionToken);
    if (redisData) {
      // Update last used time
      await this.updateSessionLastUsed(sessionToken);
      return redisData as SessionData;
    }

    // Fallback to database
    const session = await this.prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Restore to Redis
    const sessionData: SessionData = {
      userId: session.userId,
      username: session.user.username,
      email: session.user.email || undefined,
      deviceInfo: session.deviceInfo || undefined,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
    };

    const ttlSeconds = Math.floor(
      (session.expiresAt.getTime() - Date.now()) / 1000,
    );
    await this.redisService.setSession(sessionToken, sessionData, ttlSeconds);

    // Update last used time
    await this.updateSessionLastUsed(sessionToken);

    return sessionData;
  }

  /**
   * Refresh session and extend expiration
   */
  async refreshSession(
    sessionToken: string,
    extendExpiration = true,
  ): Promise<{
    sessionData: SessionData;
    tokens?: TokenPair;
  } | null> {
    const sessionData = await this.validateSession(sessionToken);
    if (!sessionData) {
      return null;
    }

    if (extendExpiration) {
      // Get session from database to determine device type
      const session = await this.prisma.session.findUnique({
        where: { sessionToken },
      });

      if (!session) {
        return null;
      }

      // Determine if it's a mobile session based on user agent or device info
      const isMobile = this.isMobileDevice(
        session.userAgent,
        session.deviceInfo,
      );
      const rememberMe = this.isLongSession(
        session.expiresAt,
        session.createdAt,
      );

      // Calculate new expiration
      const expirationDays = this.getSessionExpirationDays(
        isMobile,
        rememberMe,
      );
      const newExpiresAt = new Date(
        Date.now() + expirationDays * 24 * 60 * 60 * 1000,
      );

      // Update database
      await this.prisma.session.update({
        where: { sessionToken },
        data: {
          expiresAt: newExpiresAt,
          lastUsedAt: new Date(),
        },
      });

      // Update Redis TTL
      const ttlSeconds = Math.floor(
        (newExpiresAt.getTime() - Date.now()) / 1000,
      );
      await this.redisService.refreshSession(sessionToken, ttlSeconds);

      // Generate new tokens
      const tokens = this.jwtService.generateTokens(
        sessionData.userId,
        sessionData.username,
        sessionData.email,
        session.id,
      );

      this.logger.debug(`Session refreshed: ${sessionToken}`);

      return { sessionData, tokens };
    }

    return { sessionData };
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionToken: string): Promise<void> {
    // Remove from Redis
    await this.redisService.deleteSession(sessionToken);

    // Remove from database
    await this.prisma.session.delete({
      where: { sessionToken },
    });

    this.logger.log(`Session invalidated: ${sessionToken}`);
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    // Get all user sessions
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { sessionToken: true },
    });

    // Remove from Redis
    for (const session of sessions) {
      await this.redisService.deleteSession(session.sessionToken);
    }

    // Remove from database
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    this.logger.log(`All sessions invalidated for user: ${userId}`);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((session) => ({
      sessionId: session.id,
      deviceInfo: session.deviceInfo || undefined,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      isActive: session.expiresAt > new Date(),
    }));
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }
  }

  /**
   * Update session last used time
   */
  private async updateSessionLastUsed(sessionToken: string): Promise<void> {
    // Update in database (async, don't wait)
    this.prisma.session
      .update({
        where: { sessionToken },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to update session last used time: ${errorMessage}`,
        );
      });

    // Update in Redis session data
    const sessionData = (await this.redisService.getSession(
      sessionToken,
    )) as SessionData;
    if (sessionData) {
      sessionData.lastUsedAt = new Date().toISOString();
      // Get current TTL and reset with updated data
      const ttl = await this.redisService
        .getClient()
        .ttl(`session:${sessionToken}`);
      if (ttl > 0) {
        await this.redisService.setSession(sessionToken, sessionData, ttl);
      }
    }
  }

  /**
   * Generate secure session token
   */
  private generateSessionToken(): string {
    // Generate a secure random token
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get session expiration days based on device type and remember me setting
   */
  private getSessionExpirationDays(
    isMobile: boolean,
    rememberMe: boolean,
  ): number {
    if (rememberMe || isMobile) {
      return parseInt(process.env.MOBILE_SESSION_TIMEOUT_DAYS || '90', 10);
    }
    return parseInt(process.env.WEB_SESSION_TIMEOUT_DAYS || '30', 10);
  }

  /**
   * Determine if device is mobile based on user agent or device info
   */
  private isMobileDevice(userAgent?: string, deviceInfo?: string): boolean {
    if (!userAgent && !deviceInfo) {
      return false;
    }

    const mobileKeywords = [
      'Mobile',
      'Android',
      'iPhone',
      'iPad',
      'iPod',
      'BlackBerry',
      'Windows Phone',
      'Opera Mini',
    ];

    const checkString = `${userAgent || ''} ${deviceInfo || ''}`.toLowerCase();
    return mobileKeywords.some((keyword) =>
      checkString.includes(keyword.toLowerCase()),
    );
  }

  /**
   * Determine if session is a long session based on expiration time
   */
  private isLongSession(expiresAt: Date, createdAt: Date): boolean {
    const sessionDurationDays =
      (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return sessionDurationDays > 45; // Consider sessions longer than 45 days as "remember me"
  }
}
