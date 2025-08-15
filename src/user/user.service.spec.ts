import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '@prisma/client';

import { UsernameUnavailableException } from '../auth/exceptions/auth.exceptions';
import { PrismaService } from '../prisma/prisma.service';

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
});
