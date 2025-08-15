import { HttpStatus, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '@prisma/client';

import { UsernameUnavailableException } from '../auth/exceptions/auth.exceptions';
import { SessionService, SessionInfo } from '../auth/services/session.service';
import { PrismaService } from '../prisma/prisma.service';

import { ChangeUsernameDto } from './dto/change-username.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;
  let sessionService: jest.Mocked<SessionService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    usernameLower: 'testuser',
    email: 'test@example.com',
    emailLower: 'test@example.com',
    displayName: 'Test User',
    bio: 'Test bio',
    location: 'Test City',
    websiteUrl: 'https://test.com',
    profilePicturePath: null,
    headerImagePath: null,
    birthDate: new Date('1990-01-01'),
    password: 'hashedpassword',
    emailVerified: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    followerCount: 10,
    followingCount: 5,
    tweetCount: 20,
    isVerified: false,
    isPrivate: false,
    isSuspended: false,
    suspensionReason: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
    lastLoginIp: '127.0.0.1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthenticatedRequest = {
    user: {
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      sessionId: 'session-123',
    },
  } as any;

  const mockSessionInfo: SessionInfo = {
    sessionId: 'session-123',
    deviceInfo: 'Chrome Browser',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  };

  beforeEach(async () => {
    const mockUserService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changeUsername: jest.fn(),
      deactivateAccount: jest.fn(),
    };

    const mockSessionService = {
      getUserSessions: jest.fn(),
      invalidateSession: jest.fn(),
    };

    const mockPrismaService = {
      session: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
    sessionService = module.get(SessionService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const expectedProfile = {
        id: mockUser.id,
        username: mockUser.username,
        usernameLower: mockUser.usernameLower,
        email: mockUser.email,
        emailLower: mockUser.emailLower,
        displayName: mockUser.displayName,
        bio: mockUser.bio,
        location: mockUser.location,
        websiteUrl: mockUser.websiteUrl,
        profilePicturePath: mockUser.profilePicturePath,
        headerImagePath: mockUser.headerImagePath,
        birthDate: mockUser.birthDate,
        followerCount: mockUser.followerCount,
        followingCount: mockUser.followingCount,
        tweetCount: mockUser.tweetCount,
        isVerified: mockUser.isVerified,
        isPrivate: mockUser.isPrivate,
        isSuspended: mockUser.isSuspended,
        suspensionReason: mockUser.suspensionReason,
        emailVerified: mockUser.emailVerified,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      userService.getProfile.mockResolvedValue(expectedProfile);

      const result = await controller.getProfile(mockAuthenticatedRequest);

      expect(userService.getProfile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expectedProfile);
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.getProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.getProfile(mockAuthenticatedRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateDto: UpdateProfileDto = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        location: 'Updated City',
        websiteUrl: 'https://updated.com',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      userService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(
        mockAuthenticatedRequest,
        updateDto,
      );

      expect(userService.updateProfile).toHaveBeenCalledWith(
        'user-123',
        updateDto,
      );
      expect(result).toEqual({
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        location: updatedUser.location,
        websiteUrl: updatedUser.websiteUrl,
        updatedAt: updatedUser.updatedAt,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateDto: UpdateProfileDto = {
        displayName: 'Updated Name',
      };

      userService.updateProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.updateProfile(mockAuthenticatedRequest, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeUsername', () => {
    it('should change username successfully', async () => {
      const changeUsernameDto: ChangeUsernameDto = {
        username: 'newusername',
      };

      const updatedUser = {
        ...mockUser,
        username: 'newusername',
        usernameLower: 'newusername',
      };
      userService.changeUsername.mockResolvedValue(updatedUser);

      const result = await controller.changeUsername(
        mockAuthenticatedRequest,
        changeUsernameDto,
      );

      expect(userService.changeUsername).toHaveBeenCalledWith(
        'user-123',
        'newusername',
      );
      expect(result).toEqual({
        id: updatedUser.id,
        username: updatedUser.username,
        usernameLower: updatedUser.usernameLower,
        updatedAt: updatedUser.updatedAt,
      });
    });

    it('should throw UsernameUnavailableException when username is taken', async () => {
      const changeUsernameDto: ChangeUsernameDto = {
        username: 'takenusername',
      };

      userService.changeUsername.mockRejectedValue(
        new UsernameUnavailableException('takenusername', [
          'takenusername1',
          'takenusername2',
        ]),
      );

      await expect(
        controller.changeUsername(mockAuthenticatedRequest, changeUsernameDto),
      ).rejects.toThrow(UsernameUnavailableException);
    });

    it('should throw NotFoundException when user not found', async () => {
      const changeUsernameDto: ChangeUsernameDto = {
        username: 'newusername',
      };

      userService.changeUsername.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.changeUsername(mockAuthenticatedRequest, changeUsernameDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSessions', () => {
    it('should return user sessions with current session marked', async () => {
      const mockSessions: SessionInfo[] = [
        { ...mockSessionInfo, sessionId: 'session-123' },
        { ...mockSessionInfo, sessionId: 'session-456' },
      ];

      sessionService.getUserSessions.mockResolvedValue(mockSessions);

      const result = await controller.getSessions(mockAuthenticatedRequest);

      expect(sessionService.getUserSessions).toHaveBeenCalledWith('user-123');
      expect(result).toEqual([
        { ...mockSessions[0], isCurrent: true },
        { ...mockSessions[1], isCurrent: false },
      ]);
    });

    it('should return empty array when no sessions found', async () => {
      sessionService.getUserSessions.mockResolvedValue([]);

      const result = await controller.getSessions(mockAuthenticatedRequest);

      expect(result).toEqual([]);
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      const sessionId = 'session-456';
      const mockSessions: SessionInfo[] = [
        { ...mockSessionInfo, sessionId: 'session-123' },
        { ...mockSessionInfo, sessionId: 'session-456' },
      ];

      sessionService.getUserSessions.mockResolvedValue(mockSessions);
      prismaService.session.findUnique.mockResolvedValue({
        sessionToken: 'token-456',
      } as any);
      sessionService.invalidateSession.mockResolvedValue();

      await controller.revokeSession(mockAuthenticatedRequest, sessionId);

      expect(sessionService.getUserSessions).toHaveBeenCalledWith('user-123');
      expect(prismaService.session.findUnique).toHaveBeenCalledWith({
        where: { id: sessionId },
        select: { sessionToken: true },
      });
      expect(sessionService.invalidateSession).toHaveBeenCalledWith(
        'token-456',
      );
    });

    it('should return silently when session not found or does not belong to user', async () => {
      const sessionId = 'non-existent-session';
      sessionService.getUserSessions.mockResolvedValue([mockSessionInfo]);

      await controller.revokeSession(mockAuthenticatedRequest, sessionId);

      expect(sessionService.getUserSessions).toHaveBeenCalledWith('user-123');
      expect(prismaService.session.findUnique).not.toHaveBeenCalled();
      expect(sessionService.invalidateSession).not.toHaveBeenCalled();
    });

    it('should handle case when session token not found in database', async () => {
      const sessionId = 'session-456';
      const mockSessions: SessionInfo[] = [
        { ...mockSessionInfo, sessionId: 'session-456' },
      ];

      sessionService.getUserSessions.mockResolvedValue(mockSessions);
      prismaService.session.findUnique.mockResolvedValue(null);

      await controller.revokeSession(mockAuthenticatedRequest, sessionId);

      expect(sessionService.invalidateSession).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions except current one', async () => {
      const mockSessions: SessionInfo[] = [
        { ...mockSessionInfo, sessionId: 'session-123' }, // current session
        { ...mockSessionInfo, sessionId: 'session-456' },
        { ...mockSessionInfo, sessionId: 'session-789' },
      ];

      sessionService.getUserSessions.mockResolvedValue(mockSessions);
      prismaService.session.findUnique
        .mockResolvedValueOnce({ sessionToken: 'token-456' } as any)
        .mockResolvedValueOnce({ sessionToken: 'token-789' } as any);
      sessionService.invalidateSession.mockResolvedValue();

      await controller.revokeAllSessions(mockAuthenticatedRequest);

      expect(sessionService.getUserSessions).toHaveBeenCalledWith('user-123');
      expect(prismaService.session.findUnique).toHaveBeenCalledTimes(2);
      expect(sessionService.invalidateSession).toHaveBeenCalledTimes(2);
      expect(sessionService.invalidateSession).toHaveBeenCalledWith(
        'token-456',
      );
      expect(sessionService.invalidateSession).toHaveBeenCalledWith(
        'token-789',
      );
    });

    it('should handle case with only current session', async () => {
      const mockSessions: SessionInfo[] = [
        { ...mockSessionInfo, sessionId: 'session-123' }, // current session only
      ];

      sessionService.getUserSessions.mockResolvedValue(mockSessions);

      await controller.revokeAllSessions(mockAuthenticatedRequest);

      expect(sessionService.getUserSessions).toHaveBeenCalledWith('user-123');
      expect(prismaService.session.findUnique).not.toHaveBeenCalled();
      expect(sessionService.invalidateSession).not.toHaveBeenCalled();
    });

    it('should handle sessions that no longer exist in database', async () => {
      const mockSessions: SessionInfo[] = [
        { ...mockSessionInfo, sessionId: 'session-123' }, // current session
        { ...mockSessionInfo, sessionId: 'session-456' },
      ];

      sessionService.getUserSessions.mockResolvedValue(mockSessions);
      prismaService.session.findUnique.mockResolvedValue(null);

      await controller.revokeAllSessions(mockAuthenticatedRequest);

      expect(sessionService.invalidateSession).not.toHaveBeenCalled();
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account successfully', async () => {
      userService.deactivateAccount.mockResolvedValue();

      await controller.deactivateAccount(mockAuthenticatedRequest);

      expect(userService.deactivateAccount).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.deactivateAccount.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.deactivateAccount(mockAuthenticatedRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
