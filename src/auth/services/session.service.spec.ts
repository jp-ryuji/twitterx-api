import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

import { JwtService } from './jwt.service';
import { SessionService, SessionData } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockPrismaService = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockRedisService = {
    setSession: jest.fn(),
    getSession: jest.fn(),
    deleteSession: jest.fn(),
    refreshSession: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      ttl: jest.fn(),
    }),
  };

  const mockJwtService = {
    generateTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create session with JWT tokens', async () => {
      const userId = 'user-123';
      const username = 'testuser';
      const email = 'test@example.com';
      const options = {
        deviceInfo: 'iPhone',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        rememberMe: true,
        isMobile: true,
      };

      const mockSession = {
        id: 'session-123',
        userId,
        sessionToken: 'session-token-123',
        deviceInfo: options.deviceInfo,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 604800,
      };

      prismaService.session.create.mockResolvedValue(mockSession);
      jwtService.generateTokens.mockReturnValue(mockTokens);
      redisService.setSession.mockResolvedValue();

      const result = await service.createSession(
        userId,
        username,
        email,
        options,
      );

      expect(result).toEqual({
        session: mockSession,
        tokens: mockTokens,
      });

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: {
          userId,
          sessionToken: expect.any(String),
          deviceInfo: options.deviceInfo,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          expiresAt: expect.any(Date),
        },
      });

      expect(jwtService.generateTokens).toHaveBeenCalledWith(
        userId,
        username,
        email,
        mockSession.id,
      );

      expect(redisService.setSession).toHaveBeenCalledWith(
        mockSession.sessionToken,
        expect.objectContaining({
          userId,
          username,
          email,
          deviceInfo: options.deviceInfo,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        }),
        expect.any(Number),
      );
    });

    it('should create session with default options', async () => {
      const userId = 'user-123';
      const username = 'testuser';

      const mockSession = {
        id: 'session-123',
        userId,
        sessionToken: 'session-token-123',
        deviceInfo: null,
        ipAddress: null,
        userAgent: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 604800,
      };

      prismaService.session.create.mockResolvedValue(mockSession);
      jwtService.generateTokens.mockReturnValue(mockTokens);
      redisService.setSession.mockResolvedValue();

      const result = await service.createSession(userId, username);

      expect(result).toEqual({
        session: mockSession,
        tokens: mockTokens,
      });

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: {
          userId,
          sessionToken: expect.any(String),
          deviceInfo: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('validateSession', () => {
    it('should return session data from Redis', async () => {
      const sessionToken = 'session-token-123';
      const mockSessionData: SessionData = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        deviceInfo: 'iPhone',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };

      redisService.getSession.mockResolvedValue(mockSessionData);
      prismaService.session.update.mockResolvedValue({} as any);

      const result = await service.validateSession(sessionToken);

      expect(result).toEqual(mockSessionData);
      expect(redisService.getSession).toHaveBeenCalledWith(sessionToken);
    });

    it('should fallback to database when Redis returns null', async () => {
      const sessionToken = 'session-token-123';
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionToken,
        deviceInfo: 'iPhone',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        createdAt: new Date(),
        lastUsedAt: new Date(),
        user: {
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      redisService.getSession.mockResolvedValue(null);
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      redisService.setSession.mockResolvedValue();
      prismaService.session.update.mockResolvedValue({} as any);

      const result = await service.validateSession(sessionToken);

      expect(result).toEqual({
        userId: mockSession.userId,
        username: mockSession.user.username,
        email: mockSession.user.email,
        deviceInfo: mockSession.deviceInfo,
        ipAddress: mockSession.ipAddress,
        userAgent: mockSession.userAgent,
        createdAt: mockSession.createdAt.toISOString(),
        lastUsedAt: mockSession.lastUsedAt.toISOString(),
      });

      expect(prismaService.session.findUnique).toHaveBeenCalledWith({
        where: { sessionToken },
        include: { user: true },
      });

      expect(redisService.setSession).toHaveBeenCalled();
    });

    it('should return null for expired session', async () => {
      const sessionToken = 'session-token-123';
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionToken,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 1 day ago
        user: {
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      redisService.getSession.mockResolvedValue(null);
      prismaService.session.findUnique.mockResolvedValue(mockSession);

      const result = await service.validateSession(sessionToken);

      expect(result).toBeNull();
    });

    it('should return null for non-existent session', async () => {
      const sessionToken = 'non-existent-token';

      redisService.getSession.mockResolvedValue(null);
      prismaService.session.findUnique.mockResolvedValue(null);

      const result = await service.validateSession(sessionToken);

      expect(result).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should refresh session and return new tokens', async () => {
      const sessionToken = 'session-token-123';
      const mockSessionData: SessionData = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };

      const mockSession = {
        id: 'session-123',
        sessionToken,
        userId: 'user-123',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        deviceInfo: 'iPhone',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Created 1 day ago
      };

      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 604800,
      };

      // Mock validateSession to return session data
      jest.spyOn(service, 'validateSession').mockResolvedValue(mockSessionData);
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.session.update.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        lastUsedAt: new Date(),
      });
      redisService.refreshSession.mockResolvedValue(true);
      jwtService.generateTokens.mockReturnValue(mockTokens);

      const result = await service.refreshSession(sessionToken, true);

      expect(result).toEqual({
        sessionData: mockSessionData,
        tokens: mockTokens,
      });

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { sessionToken },
        data: {
          expiresAt: expect.any(Date),
          lastUsedAt: expect.any(Date),
        },
      });

      expect(jwtService.generateTokens).toHaveBeenCalledWith(
        mockSessionData.userId,
        mockSessionData.username,
        mockSessionData.email,
        mockSession.id,
      );
    });

    it('should return session data without extending expiration', async () => {
      const sessionToken = 'session-token-123';
      const mockSessionData: SessionData = {
        userId: 'user-123',
        username: 'testuser',
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };

      jest.spyOn(service, 'validateSession').mockResolvedValue(mockSessionData);

      const result = await service.refreshSession(sessionToken, false);

      expect(result).toEqual({
        sessionData: mockSessionData,
      });

      expect(prismaService.session.update).not.toHaveBeenCalled();
      expect(jwtService.generateTokens).not.toHaveBeenCalled();
    });

    it('should return null for invalid session', async () => {
      const sessionToken = 'invalid-token';

      jest.spyOn(service, 'validateSession').mockResolvedValue(null);

      const result = await service.refreshSession(sessionToken, true);

      expect(result).toBeNull();
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate session from both Redis and database', async () => {
      const sessionToken = 'session-token-123';

      redisService.deleteSession.mockResolvedValue();
      prismaService.session.delete.mockResolvedValue({} as any);

      await service.invalidateSession(sessionToken);

      expect(redisService.deleteSession).toHaveBeenCalledWith(sessionToken);
      expect(prismaService.session.delete).toHaveBeenCalledWith({
        where: { sessionToken },
      });
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should invalidate all sessions for a user', async () => {
      const userId = 'user-123';
      const mockSessions = [
        { sessionToken: 'token-1' },
        { sessionToken: 'token-2' },
        { sessionToken: 'token-3' },
      ];

      prismaService.session.findMany.mockResolvedValue(mockSessions);
      redisService.deleteSession.mockResolvedValue();
      prismaService.session.deleteMany.mockResolvedValue({ count: 3 });

      await service.invalidateAllUserSessions(userId);

      expect(prismaService.session.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { sessionToken: true },
      });

      expect(redisService.deleteSession).toHaveBeenCalledTimes(3);
      expect(redisService.deleteSession).toHaveBeenCalledWith('token-1');
      expect(redisService.deleteSession).toHaveBeenCalledWith('token-2');
      expect(redisService.deleteSession).toHaveBeenCalledWith('token-3');

      expect(prismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('getUserSessions', () => {
    it('should return active sessions for a user', async () => {
      const userId = 'user-123';
      const mockSessions = [
        {
          id: 'session-1',
          deviceInfo: 'iPhone',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (iPhone)',
          createdAt: new Date('2023-01-01'),
          lastUsedAt: new Date('2023-01-02'),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future
        },
        {
          id: 'session-2',
          deviceInfo: 'Chrome',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0 (Windows)',
          createdAt: new Date('2023-01-03'),
          lastUsedAt: new Date('2023-01-04'),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Future
        },
      ];

      prismaService.session.findMany.mockResolvedValue(mockSessions);

      const result = await service.getUserSessions(userId);

      expect(result).toEqual([
        {
          sessionId: 'session-1',
          deviceInfo: 'iPhone',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (iPhone)',
          createdAt: mockSessions[0].createdAt,
          lastUsedAt: mockSessions[0].lastUsedAt,
          expiresAt: mockSessions[0].expiresAt,
          isActive: true,
        },
        {
          sessionId: 'session-2',
          deviceInfo: 'Chrome',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0 (Windows)',
          createdAt: mockSessions[1].createdAt,
          lastUsedAt: mockSessions[1].lastUsedAt,
          expiresAt: mockSessions[1].expiresAt,
          isActive: true,
        },
      ]);

      expect(prismaService.session.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { lastUsedAt: 'desc' },
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      prismaService.session.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredSessions();

      expect(prismaService.session.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle no expired sessions', async () => {
      prismaService.session.deleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupExpiredSessions();

      expect(prismaService.session.deleteMany).toHaveBeenCalled();
    });
  });
});
