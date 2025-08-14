import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Request } from 'express';

import { SessionService, SessionData } from '../services/session.service';

import { SessionGuard } from './session.guard';

describe('SessionGuard', () => {
  let guard: SessionGuard;
  let sessionService: jest.Mocked<SessionService>;

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionGuard,
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    guard = module.get<SessionGuard>(SessionGuard);
    sessionService = module.get(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (request: Partial<Request>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request as Request,
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    const mockSessionData: SessionData = {
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    it('should allow access with valid session token from Authorization header', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer session-token-123',
        },
      };

      const context = createMockContext(mockRequest);
      sessionService.validateSession.mockResolvedValue(mockSessionData);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(sessionService.validateSession).toHaveBeenCalledWith(
        'session-token-123',
      );
      expect((mockRequest as any).session).toEqual(mockSessionData);
      expect((mockRequest as any).user).toEqual({
        userId: mockSessionData.userId,
        username: mockSessionData.username,
        email: mockSessionData.email,
      });
    });

    it('should allow access with valid session token from cookie', async () => {
      const mockRequest = {
        headers: {},
        cookies: {
          'session-token': 'session-token-123',
        },
      };

      const context = createMockContext(mockRequest);
      sessionService.validateSession.mockResolvedValue(mockSessionData);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(sessionService.validateSession).toHaveBeenCalledWith(
        'session-token-123',
      );
      expect((mockRequest as any).session).toEqual(mockSessionData);
      expect((mockRequest as any).user).toEqual({
        userId: mockSessionData.userId,
        username: mockSessionData.username,
        email: mockSessionData.email,
      });
    });

    it('should allow access with valid session token from custom header', async () => {
      const mockRequest = {
        headers: {
          'x-session-token': 'session-token-123',
        },
      };

      const context = createMockContext(mockRequest);
      sessionService.validateSession.mockResolvedValue(mockSessionData);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(sessionService.validateSession).toHaveBeenCalledWith(
        'session-token-123',
      );
    });

    it('should prioritize Authorization header over cookie', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer header-token',
        },
        cookies: {
          'session-token': 'cookie-token',
        },
      };

      const context = createMockContext(mockRequest);
      sessionService.validateSession.mockResolvedValue(mockSessionData);

      await guard.canActivate(context);

      expect(sessionService.validateSession).toHaveBeenCalledWith(
        'header-token',
      );
    });

    it('should prioritize Authorization header over custom header', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer header-token',
          'x-session-token': 'custom-header-token',
        },
      };

      const context = createMockContext(mockRequest);
      sessionService.validateSession.mockResolvedValue(mockSessionData);

      await guard.canActivate(context);

      expect(sessionService.validateSession).toHaveBeenCalledWith(
        'header-token',
      );
    });

    it('should prioritize cookie over custom header', async () => {
      const mockRequest = {
        headers: {
          'x-session-token': 'custom-header-token',
        },
        cookies: {
          'session-token': 'cookie-token',
        },
      };

      const context = createMockContext(mockRequest);
      sessionService.validateSession.mockResolvedValue(mockSessionData);

      await guard.canActivate(context);

      expect(sessionService.validateSession).toHaveBeenCalledWith(
        'cookie-token',
      );
    });

    it('should throw UnauthorizedException when no session token provided', async () => {
      const mockRequest = {
        headers: {},
        cookies: {},
      };

      const context = createMockContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('No session token provided'),
      );

      expect(sessionService.validateSession).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when session token is invalid', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      const context = createMockContext(mockRequest);
      sessionService.validateSession.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired session'),
      );

      expect(sessionService.validateSession).toHaveBeenCalledWith(
        'invalid-token',
      );
    });

    it('should handle malformed Authorization header', async () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat token',
        },
        cookies: {},
      };

      const context = createMockContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('No session token provided'),
      );
    });

    it('should handle empty Authorization header', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer ',
        },
        cookies: {},
      };

      const context = createMockContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('No session token provided'),
      );
    });

    it('should handle session data without email', async () => {
      const sessionDataWithoutEmail: SessionData = {
        userId: 'user-123',
        username: 'testuser',
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };

      const mockRequest = {
        headers: {
          authorization: 'Bearer session-token-123',
        },
      };

      const context = createMockContext(mockRequest);
      sessionService.validateSession.mockResolvedValue(sessionDataWithoutEmail);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((mockRequest as any).user).toEqual({
        userId: sessionDataWithoutEmail.userId,
        username: sessionDataWithoutEmail.username,
        email: undefined,
      });
    });
  });
});
