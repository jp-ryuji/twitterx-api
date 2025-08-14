import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../services/jwt.service';
import { SessionService } from '../services/session.service';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: jest.Mocked<PrismaService>;
  let sessionService: jest.Mocked<SessionService>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
  };

  const mockSessionService = {
    refreshSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get(PrismaService);
    sessionService = module.get(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const mockPayload: JwtPayload = {
      sub: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      sessionId: 'session-123',
      iat: 1234567890,
      exp: 1234567890 + 900,
    };

    it('should validate user and return user data', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true,
        isSuspended: false,
        suspensionReason: null,
        emailVerified: true,
      };

      const mockSession = {
        id: 'session-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      sessionService.refreshSession.mockResolvedValue({
        sessionData: {
          userId: 'user-123',
          username: 'testuser',
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
        },
      });

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        displayName: mockUser.displayName,
        isVerified: mockUser.isVerified,
        emailVerified: mockUser.emailVerified,
        sessionId: mockPayload.sessionId,
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.sub },
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

      expect(prismaService.session.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.sessionId },
      });
    });

    it('should validate user without session ID', async () => {
      const payloadWithoutSession: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234567890 + 900,
      };

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true,
        isSuspended: false,
        suspensionReason: null,
        emailVerified: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(payloadWithoutSession);

      expect(result).toEqual({
        userId: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        displayName: mockUser.displayName,
        isVerified: mockUser.isVerified,
        emailVerified: mockUser.emailVerified,
        sessionId: undefined,
      });

      expect(prismaService.session.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.sub },
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
    });

    it('should throw UnauthorizedException when user is suspended', async () => {
      const mockSuspendedUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true,
        isSuspended: true,
        suspensionReason: 'Violation of terms',
        emailVerified: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockSuspendedUser);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('Account suspended: Violation of terms'),
      );
    });

    it('should throw UnauthorizedException when user is suspended without reason', async () => {
      const mockSuspendedUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true,
        isSuspended: true,
        suspensionReason: null,
        emailVerified: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockSuspendedUser);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('Account suspended'),
      );
    });

    it('should throw UnauthorizedException when session is not found', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true,
        isSuspended: false,
        suspensionReason: null,
        emailVerified: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('Session expired or invalid'),
      );

      expect(prismaService.session.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.sessionId },
      });
    });

    it('should throw UnauthorizedException when session is expired', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true,
        isSuspended: false,
        suspensionReason: null,
        emailVerified: true,
      };

      const mockExpiredSession = {
        id: 'session-123',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.session.findUnique.mockResolvedValue(mockExpiredSession);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('Session expired or invalid'),
      );
    });

    it('should handle session refresh errors gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true,
        isSuspended: false,
        suspensionReason: null,
        emailVerified: true,
      };

      const mockSession = {
        id: 'session-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
        sessionToken: 'session-token-123',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      sessionService.refreshSession.mockRejectedValue(new Error('Redis error'));

      // Should still return user data even if session refresh fails
      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        displayName: mockUser.displayName,
        isVerified: mockUser.isVerified,
        emailVerified: mockUser.emailVerified,
        sessionId: mockPayload.sessionId,
      });
    });
  });
});
