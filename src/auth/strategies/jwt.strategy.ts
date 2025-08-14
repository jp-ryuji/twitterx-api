import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../services/jwt.service';
import { SessionService } from '../services/session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    // Validate user exists and is not suspended
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        isVerified: true,
        isSuspended: true,
        suspensionReason: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException(
        `Account suspended${user.suspensionReason ? `: ${user.suspensionReason}` : ''}`,
      );
    }

    // Validate session if sessionId is present in token
    if (payload.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Update session last used time (async, don't wait)
      this.sessionService
        .refreshSession(session.sessionToken, false)
        .catch(() => {
          // Ignore errors in background session refresh
        });
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      isVerified: user.isVerified,
      emailVerified: user.emailVerified,
      sessionId: payload.sessionId,
    };
  }
}
