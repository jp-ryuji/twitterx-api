import { Injectable, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string; // User ID
  username: string;
  email?: string;
  iat?: number;
  exp?: number;
  sessionId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(private readonly jwtService: NestJwtService) {}

  /**
   * Generate JWT access and refresh tokens
   */
  generateTokens(
    userId: string,
    username: string,
    email?: string,
    sessionId?: string,
  ): TokenPair {
    const payload: JwtPayload = {
      sub: userId,
      username,
      email,
      sessionId,
    };

    // Access token (short-lived)
    const accessTokenExpiresIn = this.getAccessTokenExpiration();
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiresIn,
    });

    // Refresh token (long-lived)
    const refreshTokenExpiresIn = this.getRefreshTokenExpiration();
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        expiresIn: refreshTokenExpiresIn,
      },
    );

    this.logger.debug(`Generated tokens for user: ${username} (${userId})`);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationToSeconds(accessTokenExpiresIn),
      refreshExpiresIn: this.parseExpirationToSeconds(refreshTokenExpiresIn),
    };
  }

  /**
   * Validate and decode JWT token
   */
  validateToken(token: string): JwtPayload | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return payload;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Token validation failed: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Decode JWT token without verification (for expired tokens)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Token decode failed: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): {
    accessToken: string;
    expiresIn: number;
  } | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);

      // Verify it's a refresh token
      if (!('type' in payload) || payload.type !== 'refresh') {
        this.logger.warn('Invalid refresh token type');
        return null;
      }

      // Generate new access token
      const newPayload: JwtPayload = {
        sub: payload.sub,
        username: payload.username,
        email: payload.email,
        sessionId: payload.sessionId,
      };

      const accessTokenExpiresIn = this.getAccessTokenExpiration();
      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: accessTokenExpiresIn,
      });

      this.logger.debug(`Refreshed access token for user: ${payload.username}`);

      return {
        accessToken,
        expiresIn: this.parseExpirationToSeconds(accessTokenExpiresIn),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Refresh token validation failed: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get token expiration time in seconds from now
   */
  getTokenExpirationTime(token: string): number | null {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return null;
    }

    return payload.exp - Math.floor(Date.now() / 1000);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expirationTime = this.getTokenExpirationTime(token);
    return expirationTime !== null && expirationTime <= 0;
  }

  /**
   * Get access token expiration setting
   */
  private getAccessTokenExpiration(): string {
    return process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m';
  }

  /**
   * Get refresh token expiration setting
   */
  private getRefreshTokenExpiration(): string {
    return process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  /**
   * Parse expiration string to seconds
   */
  private parseExpirationToSeconds(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        // Default to seconds if no unit specified
        return parseInt(expiration, 10) || 900; // 15 minutes default
    }
  }
}
