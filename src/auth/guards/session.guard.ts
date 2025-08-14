import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';

import { SessionService } from '../services/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract session token from cookie or header
    const sessionToken = this.extractSessionToken(request);

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    // Validate session
    const sessionData = await this.sessionService.validateSession(sessionToken);

    if (!sessionData) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach session data to request
    (request as Request & { session?: any; user?: any }).session = sessionData;
    (request as Request & { session?: any; user?: any }).user = {
      userId: sessionData.userId,
      username: sessionData.username,
      email: sessionData.email,
    };

    return true;
  }

  private extractSessionToken(request: Request): string | null {
    // Try to get from Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get from session cookie
    const sessionCookie =
      request.cookies && 'session-token' in request.cookies
        ? String((request.cookies as Record<string, unknown>)['session-token'])
        : null;
    if (sessionCookie) {
      return sessionCookie;
    }

    // Try to get from custom header
    const sessionHeader = request.headers['x-session-token'] as string;
    if (sessionHeader) {
      return sessionHeader;
    }

    return null;
  }
}
