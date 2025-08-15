import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '@prisma/client';

import {
  UsernameUnavailableException,
  AccountSuspendedException,
  ShadowBannedException,
  InsufficientPermissionsException,
} from '../auth/exceptions/auth.exceptions';
import { PrismaService } from '../prisma/prisma.service';

import {
  ModerationAction,
  AdminModerationDto,
  SuspiciousActivityDto,
} from './dto/admin-moderation.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser: User = {
    id: 'user-1',
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
    followerCount: 0,
    followingCount: 0,
    tweetCount: 0,
    isVerified: false,
    isPrivate: false,
    isSuspended: false,
    suspensionReason: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    isShadowBanned: false,
    shadowBanReason: null,
    suspiciousActivityCount: 0,
    lastSuspiciousActivity: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      session: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username (case-insensitive)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByUsername('TestUser');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
    });

    it('should return null if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email (case-insensitive)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('Test@Example.Com');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: 'test@example.com' },
      });
    });

    it('should return null if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateData: UpdateProfileDto = {
      displayName: 'Updated Name',
      bio: 'Updated bio',
      location: 'Updated City',
      websiteUrl: 'https://updated.com',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', updateData);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          displayName: updateData.displayName,
          bio: updateData.bio,
          location: updateData.location,
          websiteUrl: updateData.websiteUrl,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent', updateData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { displayName: 'New Name' };
      const updatedUser = { ...mockUser, displayName: 'New Name' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', partialUpdate);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          displayName: 'New Name',
          bio: undefined,
          location: undefined,
          websiteUrl: undefined,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('changeUsername', () => {
    it('should change username successfully', async () => {
      const newUsername = 'newusername';
      const updatedUser = {
        ...mockUser,
        username: newUsername,
        usernameLower: newUsername,
      };

      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // findById call
        .mockResolvedValueOnce(null); // findByUsername call (username available)
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.changeUsername('user-1', newUsername);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          username: newUsername,
          usernameLower: newUsername,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changeUsername('nonexistent', 'newusername'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UsernameUnavailableException if username is taken', async () => {
      const existingUser = { ...mockUser, id: 'other-user' };

      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // findById call
        .mockResolvedValueOnce(existingUser); // findByUsername call (username taken)

      // Mock the suggestion generation
      prismaService.user.findUnique
        .mockResolvedValueOnce(null) // suggestion 1 available
        .mockResolvedValueOnce(null) // suggestion 2 available
        .mockResolvedValueOnce(null); // suggestion 3 available

      await expect(
        service.changeUsername('user-1', 'takenusername'),
      ).rejects.toThrow(UsernameUnavailableException);
    });

    it('should allow user to change to same username (case change)', async () => {
      const newUsername = 'TestUser'; // Same username but different case
      const updatedUser = { ...mockUser, username: newUsername };

      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // findById call
        .mockResolvedValueOnce(mockUser); // findByUsername call (same user)
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.changeUsername('user-1', newUsername);

      expect(result).toEqual(updatedUser);
    });

    it('should throw error for invalid username format', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.changeUsername('user-1', 'ab')).rejects.toThrow(
        'Username must be 3-15 characters long and contain only letters, numbers, and underscores',
      );

      await expect(
        service.changeUsername('user-1', 'user-with-dashes'),
      ).rejects.toThrow(
        'Username must be 3-15 characters long and contain only letters, numbers, and underscores',
      );

      await expect(
        service.changeUsername('user-1', 'verylongusernamethatexceedslimit'),
      ).rejects.toThrow(
        'Username must be 3-15 characters long and contain only letters, numbers, and underscores',
      );
    });

    it('should throw error for blocked usernames', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.changeUsername('user-1', 'admin')).rejects.toThrow(
        'This username is not available',
      );

      await expect(service.changeUsername('user-1', 'system')).rejects.toThrow(
        'This username is not available',
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('emailVerificationToken');
      expect(result).not.toHaveProperty('passwordResetToken');
      expect(result).not.toHaveProperty('passwordResetExpires');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account and invalidate sessions', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        isSuspended: true,
      });
      prismaService.session.deleteMany.mockResolvedValue({ count: 2 });

      await service.deactivateAccount('user-1');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          isSuspended: true,
          suspensionReason: 'Account deactivated by user',
          updatedAt: expect.any(Date),
        },
      });

      expect(prismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deactivateAccount('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isUsernameAvailable', () => {
    it('should return true if username is available', async () => {
      jest.spyOn(service, 'findByUsername').mockResolvedValue(null);

      const result = await service.isUsernameAvailable('availableusername');

      expect(result).toBe(true);
    });

    it('should return false if username is taken', async () => {
      jest.spyOn(service, 'findByUsername').mockResolvedValue(mockUser);

      const result = await service.isUsernameAvailable('testuser');

      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });

    it('should return true if username is taken by excluded user', async () => {
      jest.spyOn(service, 'findByUsername').mockResolvedValue(mockUser);

      const result = await service.isUsernameAvailable('testuser', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false if username is taken by different user', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      jest.spyOn(service, 'findByUsername').mockResolvedValue(otherUser);

      const result = await service.isUsernameAvailable('testuser', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('generateUsernameSuggestions', () => {
    it('should generate username suggestions with numbers', async () => {
      // Mock availability checks - first two suggestions are taken, third is available
      const isUsernameAvailableSpy = jest.spyOn(service, 'isUsernameAvailable');
      isUsernameAvailableSpy
        .mockResolvedValueOnce(false) // testuser1 taken
        .mockResolvedValueOnce(false) // testuser2 taken
        .mockResolvedValueOnce(true) // testuser3 available
        .mockResolvedValueOnce(true) // testuser4 available
        .mockResolvedValueOnce(true); // testuser5 available

      // Access private method through service instance
      const suggestions = await (service as any).generateUsernameSuggestions(
        'testuser',
      );

      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('testuser3');
      expect(suggestions).toContain('testuser4');
      expect(suggestions).toContain('testuser5');
    });

    it('should generate suggestions with underscores if numbers are not available', async () => {
      const isUsernameAvailableSpy = jest.spyOn(service, 'isUsernameAvailable');

      // Mock 6 calls for numbered suggestions (all taken)
      for (let i = 0; i < 6; i++) {
        isUsernameAvailableSpy.mockResolvedValueOnce(false);
      }

      // Mock underscore suggestions as available
      isUsernameAvailableSpy
        .mockResolvedValueOnce(true) // testuser_1 available
        .mockResolvedValueOnce(true) // testuser_2 available
        .mockResolvedValueOnce(true); // testuser_3 available

      const suggestions = await (service as any).generateUsernameSuggestions(
        'testuser',
      );

      expect(suggestions).toContain('testuser_1');
      expect(suggestions).toContain('testuser_2');
      expect(suggestions).toContain('testuser_3');
    });

    it('should respect username length limit', async () => {
      // Test with a long base username
      const longUsername = 'verylongusername'; // 16 characters, would exceed limit with numbers

      const suggestions = await (service as any).generateUsernameSuggestions(
        longUsername,
      );

      // Should return empty array since adding numbers would exceed 15 character limit
      expect(suggestions).toEqual([]);
    });
  });

  describe('Security and Moderation Features', () => {
    describe('performModerationAction', () => {
      const adminUserId = 'admin-1';
      const targetUserId = 'user-2';
      const adminUser = { ...mockUser, id: adminUserId };
      const targetUser = { ...mockUser, id: targetUserId };

      it('should suspend user account', async () => {
        const moderationDto: AdminModerationDto = {
          action: ModerationAction.SUSPEND,
          reason: 'Violation of community guidelines',
        };

        const suspendedUser = {
          ...targetUser,
          isSuspended: true,
          suspensionReason: 'Violation of community guidelines',
        };

        prismaService.user.findUnique
          .mockResolvedValueOnce(targetUser) // target user lookup
          .mockResolvedValueOnce(adminUser); // admin user lookup
        prismaService.user.update.mockResolvedValue(suspendedUser);
        prismaService.session.deleteMany.mockResolvedValue({ count: 2 });

        const result = await service.performModerationAction(
          targetUserId,
          moderationDto,
          adminUserId,
        );

        expect(result).toEqual(suspendedUser);
        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: targetUserId },
          data: {
            isSuspended: true,
            suspensionReason: 'Violation of community guidelines',
            updatedAt: expect.any(Date),
          },
        });
        expect(prismaService.session.deleteMany).toHaveBeenCalledWith({
          where: { userId: targetUserId },
        });
      });

      it('should unsuspend user account', async () => {
        const moderationDto: AdminModerationDto = {
          action: ModerationAction.UNSUSPEND,
        };

        const unsuspendedUser = {
          ...targetUser,
          isSuspended: false,
          suspensionReason: null,
        };

        prismaService.user.findUnique
          .mockResolvedValueOnce(targetUser)
          .mockResolvedValueOnce(adminUser);
        prismaService.user.update.mockResolvedValue(unsuspendedUser);

        const result = await service.performModerationAction(
          targetUserId,
          moderationDto,
          adminUserId,
        );

        expect(result).toEqual(unsuspendedUser);
        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: targetUserId },
          data: {
            isSuspended: false,
            suspensionReason: null,
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should verify user account', async () => {
        const moderationDto: AdminModerationDto = {
          action: ModerationAction.VERIFY,
        };

        const verifiedUser = { ...targetUser, isVerified: true };

        prismaService.user.findUnique
          .mockResolvedValueOnce(targetUser)
          .mockResolvedValueOnce(adminUser);
        prismaService.user.update.mockResolvedValue(verifiedUser);

        const result = await service.performModerationAction(
          targetUserId,
          moderationDto,
          adminUserId,
        );

        expect(result).toEqual(verifiedUser);
        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: targetUserId },
          data: {
            isVerified: true,
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should apply shadow ban', async () => {
        const moderationDto: AdminModerationDto = {
          action: ModerationAction.SHADOW_BAN,
          reason: 'Suspicious behavior detected',
        };

        const shadowBannedUser = {
          ...targetUser,
          isShadowBanned: true,
          shadowBanReason: 'Suspicious behavior detected',
        };

        prismaService.user.findUnique
          .mockResolvedValueOnce(targetUser)
          .mockResolvedValueOnce(adminUser);
        prismaService.user.update.mockResolvedValue(shadowBannedUser);

        const result = await service.performModerationAction(
          targetUserId,
          moderationDto,
          adminUserId,
        );

        expect(result).toEqual(shadowBannedUser);
        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: targetUserId },
          data: {
            isShadowBanned: true,
            shadowBanReason: 'Suspicious behavior detected',
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should throw NotFoundException if target user not found', async () => {
        const moderationDto: AdminModerationDto = {
          action: ModerationAction.SUSPEND,
        };

        prismaService.user.findUnique.mockResolvedValue(null);

        await expect(
          service.performModerationAction(
            'nonexistent',
            moderationDto,
            adminUserId,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw InsufficientPermissionsException if admin user not found', async () => {
        const moderationDto: AdminModerationDto = {
          action: ModerationAction.SUSPEND,
        };

        prismaService.user.findUnique
          .mockResolvedValueOnce(targetUser) // target user found
          .mockResolvedValueOnce(null); // admin user not found

        await expect(
          service.performModerationAction(
            targetUserId,
            moderationDto,
            'nonexistent',
          ),
        ).rejects.toThrow(InsufficientPermissionsException);
      });
    });

    describe('reportSuspiciousActivity', () => {
      it('should report suspicious activity and increment counter', async () => {
        const activityDto: SuspiciousActivityDto = {
          activityType: 'rapid_following',
          details: 'User followed 50 accounts in 5 minutes',
          autoRestrict: false,
        };

        const updatedUser = {
          ...mockUser,
          suspiciousActivityCount: 1,
          lastSuspiciousActivity: new Date(),
        };

        prismaService.user.findUnique.mockResolvedValue(mockUser);
        prismaService.user.update.mockResolvedValue(updatedUser);

        await service.reportSuspiciousActivity('user-1', activityDto);

        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: 'user-1' },
          data: {
            suspiciousActivityCount: { increment: 1 },
            lastSuspiciousActivity: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should auto-restrict when autoRestrict is true', async () => {
        const activityDto: SuspiciousActivityDto = {
          activityType: 'spam_posting',
          autoRestrict: true,
        };

        const updatedUser = {
          ...mockUser,
          suspiciousActivityCount: 1,
          isShadowBanned: true,
        };

        prismaService.user.findUnique.mockResolvedValue(mockUser);
        prismaService.user.update
          .mockResolvedValueOnce(updatedUser) // First update for activity count
          .mockResolvedValueOnce(updatedUser); // Second update for shadow ban

        await service.reportSuspiciousActivity('user-1', activityDto);

        expect(prismaService.user.update).toHaveBeenCalledTimes(2);
      });

      it('should auto-restrict when threshold is reached', async () => {
        const activityDto: SuspiciousActivityDto = {
          activityType: 'suspicious_login',
          autoRestrict: false,
        };

        const userWithHighCount = {
          ...mockUser,
          suspiciousActivityCount: 5, // At threshold
        };

        prismaService.user.findUnique.mockResolvedValue(mockUser);
        prismaService.user.update
          .mockResolvedValueOnce(userWithHighCount) // Activity count update
          .mockResolvedValueOnce(userWithHighCount); // Shadow ban update

        await service.reportSuspiciousActivity('user-1', activityDto);

        expect(prismaService.user.update).toHaveBeenCalledTimes(2);
      });

      it('should throw NotFoundException if user not found', async () => {
        const activityDto: SuspiciousActivityDto = {
          activityType: 'test',
        };

        prismaService.user.findUnique.mockResolvedValue(null);

        await expect(
          service.reportSuspiciousActivity('nonexistent', activityDto),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('checkShadowBanStatus', () => {
      it('should throw ShadowBannedException if user is shadow banned', async () => {
        const shadowBannedUser = { ...mockUser, isShadowBanned: true };
        prismaService.user.findUnique.mockResolvedValue(shadowBannedUser);

        await expect(service.checkShadowBanStatus('user-1')).rejects.toThrow(
          ShadowBannedException,
        );
      });

      it('should not throw if user is not shadow banned', async () => {
        prismaService.user.findUnique.mockResolvedValue(mockUser);

        await expect(
          service.checkShadowBanStatus('user-1'),
        ).resolves.not.toThrow();
      });
    });

    describe('checkAccountStatus', () => {
      it('should throw AccountSuspendedException if user is suspended', async () => {
        const suspendedUser = {
          ...mockUser,
          isSuspended: true,
          suspensionReason: 'Terms violation',
        };
        prismaService.user.findUnique.mockResolvedValue(suspendedUser);

        await expect(service.checkAccountStatus('user-1')).rejects.toThrow(
          AccountSuspendedException,
        );
      });

      it('should throw ShadowBannedException if user is shadow banned', async () => {
        const shadowBannedUser = { ...mockUser, isShadowBanned: true };
        prismaService.user.findUnique.mockResolvedValue(shadowBannedUser);

        await expect(service.checkAccountStatus('user-1')).rejects.toThrow(
          ShadowBannedException,
        );
      });

      it('should throw NotFoundException if user not found', async () => {
        prismaService.user.findUnique.mockResolvedValue(null);

        await expect(service.checkAccountStatus('nonexistent')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should not throw if user account is in good standing', async () => {
        prismaService.user.findUnique.mockResolvedValue(mockUser);

        await expect(
          service.checkAccountStatus('user-1'),
        ).resolves.not.toThrow();
      });
    });

    describe('getModerationStatus', () => {
      it('should return user moderation status', async () => {
        const userWithModerationData = {
          ...mockUser,
          isSuspended: true,
          suspensionReason: 'Test suspension',
          isVerified: true,
          isShadowBanned: false,
          shadowBanReason: null,
          suspiciousActivityCount: 2,
          lastSuspiciousActivity: new Date('2023-01-01'),
          failedLoginAttempts: 1,
          lockedUntil: null,
        };

        prismaService.user.findUnique.mockResolvedValue(userWithModerationData);

        const result = await service.getModerationStatus('user-1');

        expect(result).toEqual({
          isSuspended: true,
          suspensionReason: 'Test suspension',
          isVerified: true,
          isShadowBanned: false,
          shadowBanReason: null,
          suspiciousActivityCount: 2,
          lastSuspiciousActivity: new Date('2023-01-01'),
          failedLoginAttempts: 1,
          lockedUntil: null,
        });
      });

      it('should throw NotFoundException if user not found', async () => {
        prismaService.user.findUnique.mockResolvedValue(null);

        await expect(
          service.getModerationStatus('nonexistent'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('detectSuspiciousLogin', () => {
      it('should detect suspicious IP change', async () => {
        const userWithRecentLogin = {
          ...mockUser,
          lastLoginIp: '192.168.1.1',
          lastLoginAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        };

        prismaService.user.findUnique.mockResolvedValue(userWithRecentLogin);
        prismaService.user.update.mockResolvedValue(userWithRecentLogin);

        const result = await service.detectSuspiciousLogin(
          'user-1',
          '10.0.0.1', // Different IP
          'Mozilla/5.0',
        );

        expect(result).toBe(true);
        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: 'user-1' },
          data: {
            suspiciousActivityCount: { increment: 1 },
            lastSuspiciousActivity: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should detect multiple failed attempts', async () => {
        const userWithFailedAttempts = {
          ...mockUser,
          failedLoginAttempts: 3,
        };

        prismaService.user.findUnique.mockResolvedValue(userWithFailedAttempts);
        prismaService.user.update.mockResolvedValue(userWithFailedAttempts);

        const result = await service.detectSuspiciousLogin(
          'user-1',
          '192.168.1.1',
          'Mozilla/5.0',
        );

        expect(result).toBe(true);
      });

      it('should not detect suspicious activity for normal login', async () => {
        const normalUser = {
          ...mockUser,
          lastLoginIp: '192.168.1.1',
          lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          failedLoginAttempts: 0,
        };

        prismaService.user.findUnique.mockResolvedValue(normalUser);

        const result = await service.detectSuspiciousLogin(
          'user-1',
          '192.168.1.1', // Same IP
          'Mozilla/5.0',
        );

        expect(result).toBe(false);
      });

      it('should return false if user not found', async () => {
        prismaService.user.findUnique.mockResolvedValue(null);

        const result = await service.detectSuspiciousLogin(
          'nonexistent',
          '192.168.1.1',
          'Mozilla/5.0',
        );

        expect(result).toBe(false);
      });
    });
  });
});
