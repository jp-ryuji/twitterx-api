import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { AuthService } from './auth.service';
import { SignUpDto, SignInDto } from './dto';
import {
  UsernameUnavailableException,
  EmailAlreadyExistsException,
  InvalidPasswordException,
  InvalidCredentialsException,
  AccountLockedException,
  AccountSuspendedException,
} from './exceptions';
import { PasswordService } from './services';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let passwordService: jest.Mocked<PasswordService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser = {
    id: 'test-user-id',
    username: 'testuser',
    usernameLower: 'testuser',
    email: 'test@example.com',
    emailLower: 'test@example.com',
    displayName: 'Test User',
    bio: null,
    location: null,
    websiteUrl: null,
    profilePicturePath: null,
    headerImagePath: null,
    birthDate: new Date('1990-01-01'),
    password: 'hashed-password',
    emailVerified: false,
    emailVerificationToken: 'verification-token',
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
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
      },
    };

    const mockPasswordService = {
      validatePasswordStrength: jest.fn(),
      hashPassword: jest.fn(),
      generateSecureToken: jest.fn(),
      validatePassword: jest.fn(),
    };

    const mockRedisService = {
      setSession: jest.fn(),
      incrementRateLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    passwordService = module.get(PasswordService);
    redisService = module.get(RedisService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validSignUpDto: SignUpDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'ValidPassword123!',
      displayName: 'Test User',
      birthDate: '1990-01-01',
    };

    it('should successfully register a user with email', async () => {
      // Arrange
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique.mockResolvedValue(null); // No existing user
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      passwordService.generateSecureToken.mockReturnValue('verification-token');
      prismaService.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await service.registerUser(validSignUpDto);

      // Assert
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'test-user-id',
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
        }),
        emailVerificationToken: 'verification-token',
      });

      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
        'ValidPassword123!',
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: 'test@example.com' },
      });
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        'ValidPassword123!',
      );
      expect(passwordService.generateSecureToken).toHaveBeenCalled();
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          usernameLower: 'testuser',
          email: 'test@example.com',
          emailLower: 'test@example.com',
          password: 'hashed-password',
          displayName: 'Test User',
          birthDate: new Date('1990-01-01'),
          emailVerificationToken: 'verification-token',
          emailVerified: false,
        },
      });
    });

    it('should successfully register a user without email', async () => {
      // Arrange
      const signUpDtoWithoutEmail = { ...validSignUpDto };
      delete signUpDtoWithoutEmail.email;

      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');

      const userWithoutEmail = { ...mockUser, email: null, emailLower: null };
      prismaService.user.create.mockResolvedValue(userWithoutEmail);

      // Act
      const result = await service.registerUser(signUpDtoWithoutEmail);

      // Assert
      expect(result).toEqual({
        user: expect.objectContaining({
          username: 'testuser',
          email: null,
        }),
        emailVerificationToken: undefined,
      });

      expect(passwordService.generateSecureToken).not.toHaveBeenCalled();
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          usernameLower: 'testuser',
          email: null,
          emailLower: null,
          password: 'hashed-password',
          displayName: 'Test User',
          birthDate: new Date('1990-01-01'),
          emailVerificationToken: undefined,
          emailVerified: true, // No email means "verified"
        },
      });
    });

    it('should handle case-insensitive username checking', async () => {
      // Arrange
      const signUpDtoWithMixedCase = {
        ...validSignUpDto,
        username: 'TestUser',
      };

      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      passwordService.generateSecureToken.mockReturnValue('verification-token');
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        username: 'TestUser',
        usernameLower: 'testuser',
      });

      // Act
      const result = await service.registerUser(signUpDtoWithMixedCase);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'TestUser',
          usernameLower: 'testuser',
        }),
      });
    });

    it('should handle case-insensitive email checking', async () => {
      // Arrange
      const signUpDtoWithMixedCaseEmail = {
        ...validSignUpDto,
        email: 'Test@Example.COM',
      };

      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      passwordService.generateSecureToken.mockReturnValue('verification-token');
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: 'test@example.com',
        emailLower: 'test@example.com',
      });

      // Act
      const result = await service.registerUser(signUpDtoWithMixedCaseEmail);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: 'test@example.com' },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          emailLower: 'test@example.com',
        }),
      });
    });

    it('should throw InvalidPasswordException for weak password', async () => {
      // Arrange
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must contain at least one uppercase letter'],
      });

      // Act & Assert
      await expect(service.registerUser(validSignUpDto)).rejects.toThrow(
        InvalidPasswordException,
      );

      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
        'ValidPassword123!',
      );
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UsernameUnavailableException when username exists', async () => {
      // Arrange
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // Username exists
        .mockResolvedValue(null); // Suggestions don't exist

      // Act & Assert
      await expect(service.registerUser(validSignUpDto)).rejects.toThrow(
        UsernameUnavailableException,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
    });

    it('should throw EmailAlreadyExistsException when email exists', async () => {
      // Arrange
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique
        .mockResolvedValueOnce(null) // Username doesn't exist
        .mockResolvedValueOnce(mockUser); // Email exists

      // Act & Assert
      await expect(service.registerUser(validSignUpDto)).rejects.toThrow(
        EmailAlreadyExistsException,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: 'test@example.com' },
      });
    });

    it('should generate username suggestions when username is taken', async () => {
      // Arrange
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // Original username exists
        .mockResolvedValueOnce(null) // testuser1 doesn't exist
        .mockResolvedValueOnce(null) // testuser2 doesn't exist
        .mockResolvedValueOnce(null); // testuser3 doesn't exist

      // Act & Assert
      const error = await service.registerUser(validSignUpDto).catch((e) => e);

      expect(error).toBeInstanceOf(UsernameUnavailableException);
      expect(error.getResponse()).toEqual({
        message: "Username 'testuser' is not available",
        suggestions: ['testuser1', 'testuser2', 'testuser3'],
        code: 'USERNAME_UNAVAILABLE',
      });
    });

    it('should sanitize input data', async () => {
      // Arrange
      const signUpDtoWithUnsafeData: SignUpDto = {
        username: '  test_user  ',
        email: '  TEST@EXAMPLE.COM  ',
        password: 'ValidPassword123!',
        displayName: '  Test User  ',
      };

      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      passwordService.generateSecureToken.mockReturnValue('verification-token');
      prismaService.user.create.mockResolvedValue(mockUser);

      // Act
      await service.registerUser(signUpDtoWithUnsafeData);

      // Assert
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'test_user',
          usernameLower: 'test_user',
          email: 'test@example.com',
          emailLower: 'test@example.com',
          displayName: 'Test User',
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      prismaService.user.findUnique.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      passwordService.generateSecureToken.mockReturnValue('verification-token');
      prismaService.user.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.registerUser(validSignUpDto)).rejects.toThrow(
        'Database error',
      );

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to register user: Database error',
        expect.any(String),
      );
    });
  });

  describe('isUsernameAvailable', () => {
    it('should return true when username is available', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isUsernameAvailable('newuser');

      // Assert
      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'newuser' },
      });
    });

    it('should return false when username is taken', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.isUsernameAvailable('testuser');

      // Assert
      expect(result).toBe(false);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
    });

    it('should handle case-insensitive checking', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isUsernameAvailable('TestUser');

      // Assert
      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
    });
  });

  describe('isEmailAvailable', () => {
    it('should return true when email is available', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isEmailAvailable('new@example.com');

      // Assert
      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: 'new@example.com' },
      });
    });

    it('should return false when email is taken', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.isEmailAvailable('test@example.com');

      // Assert
      expect(result).toBe(false);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: 'test@example.com' },
      });
    });

    it('should handle case-insensitive checking', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isEmailAvailable('TEST@EXAMPLE.COM');

      // Assert
      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: 'test@example.com' },
      });
    });
  });

  describe('signIn', () => {
    const validSignInDto: SignInDto = {
      emailOrUsername: 'testuser',
      password: 'ValidPassword123!',
      rememberMe: false,
    };

    const deviceInfo = {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      deviceInfo: 'Desktop',
    };

    const mockUserForLogin = {
      ...mockUser,
      password: 'hashed-password',
      isSuspended: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
      lastLoginIp: '192.168.1.2',
    };

    it('should successfully sign in with username', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUserForLogin);
      passwordService.validatePassword.mockResolvedValue(true);
      passwordService.generateSecureToken.mockReturnValue('session-token-123');
      prismaService.user.update.mockResolvedValue(mockUserForLogin);
      prismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId: mockUserForLogin.id,
        sessionToken: 'session-token-123',
        deviceInfo: 'Desktop',
        ipAddress: '192.168.1.1',
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });
      redisService.setSession.mockResolvedValue();

      // Act
      const result = await service.signIn(validSignInDto, deviceInfo);

      // Assert
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUserForLogin.id,
          username: mockUserForLogin.username,
          email: mockUserForLogin.email,
        }),
        sessionToken: 'session-token-123',
        expiresAt: expect.any(Date),
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
      expect(passwordService.validatePassword).toHaveBeenCalledWith(
        'ValidPassword123!',
        'hashed-password',
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserForLogin.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      expect(prismaService.session.create).toHaveBeenCalled();
      expect(redisService.setSession).toHaveBeenCalled();
    });

    it('should successfully sign in with email', async () => {
      // Arrange
      const signInWithEmail = {
        ...validSignInDto,
        emailOrUsername: 'test@example.com',
      };
      prismaService.user.findUnique
        .mockResolvedValueOnce(null) // Username not found
        .mockResolvedValueOnce(mockUserForLogin); // Email found
      passwordService.validatePassword.mockResolvedValue(true);
      passwordService.generateSecureToken.mockReturnValue('session-token-123');
      prismaService.user.update.mockResolvedValue(mockUserForLogin);
      prismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId: mockUserForLogin.id,
        sessionToken: 'session-token-123',
        deviceInfo: 'Desktop',
        ipAddress: '192.168.1.1',
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });
      redisService.setSession.mockResolvedValue();

      // Act
      const result = await service.signIn(signInWithEmail, deviceInfo);

      // Assert
      expect(result).toBeDefined();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'test@example.com' },
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: 'test@example.com' },
      });
    });

    it('should handle case-insensitive credential validation', async () => {
      // Arrange
      const signInWithMixedCase = {
        ...validSignInDto,
        emailOrUsername: 'TestUser',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserForLogin);
      passwordService.validatePassword.mockResolvedValue(true);
      passwordService.generateSecureToken.mockReturnValue('session-token-123');
      prismaService.user.update.mockResolvedValue(mockUserForLogin);
      prismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId: mockUserForLogin.id,
        sessionToken: 'session-token-123',
        deviceInfo: 'Desktop',
        ipAddress: '192.168.1.1',
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });
      redisService.setSession.mockResolvedValue();

      // Act
      await service.signIn(signInWithMixedCase, deviceInfo);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { usernameLower: 'testuser' },
      });
    });

    it('should throw InvalidCredentialsException for non-existent user', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.signIn(validSignInDto, deviceInfo)).rejects.toThrow(
        InvalidCredentialsException,
      );

      expect(passwordService.validatePassword).not.toHaveBeenCalled();
    });

    it('should throw AccountSuspendedException for suspended account', async () => {
      // Arrange
      const suspendedUser = {
        ...mockUserForLogin,
        isSuspended: true,
        suspensionReason: 'Violation of terms',
      };
      prismaService.user.findUnique.mockResolvedValue(suspendedUser);

      // Act & Assert
      await expect(service.signIn(validSignInDto, deviceInfo)).rejects.toThrow(
        AccountSuspendedException,
      );

      expect(passwordService.validatePassword).not.toHaveBeenCalled();
    });

    it('should throw AccountLockedException for locked account', async () => {
      // Arrange
      const lockedUser = {
        ...mockUserForLogin,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // Locked for 30 minutes
      };
      prismaService.user.findUnique.mockResolvedValue(lockedUser);

      // Act & Assert
      await expect(service.signIn(validSignInDto, deviceInfo)).rejects.toThrow(
        AccountLockedException,
      );

      expect(passwordService.validatePassword).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsException for wrong password', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUserForLogin);
      passwordService.validatePassword.mockResolvedValue(false);
      prismaService.user.update.mockResolvedValue({
        ...mockUserForLogin,
        failedLoginAttempts: 1,
      });
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Date.now() + 3600000,
      });

      // Act & Assert
      await expect(service.signIn(validSignInDto, deviceInfo)).rejects.toThrow(
        InvalidCredentialsException,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserForLogin.id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });
      expect(redisService.incrementRateLimit).toHaveBeenCalledWith(
        'failed_login:192.168.1.1',
        3600,
        20,
      );
    });

    it('should lock account after max failed attempts', async () => {
      // Arrange
      const userWithFailedAttempts = {
        ...mockUserForLogin,
        failedLoginAttempts: 4, // One less than max (5)
      };
      prismaService.user.findUnique.mockResolvedValue(userWithFailedAttempts);
      passwordService.validatePassword.mockResolvedValue(false);
      prismaService.user.update
        .mockResolvedValueOnce({
          ...userWithFailedAttempts,
          failedLoginAttempts: 5,
        })
        .mockResolvedValueOnce({
          ...userWithFailedAttempts,
          failedLoginAttempts: 5,
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        });
      redisService.incrementRateLimit.mockResolvedValue({
        count: 1,
        isLimitExceeded: false,
        resetTime: Date.now() + 3600000,
      });

      // Act & Assert
      await expect(service.signIn(validSignInDto, deviceInfo)).rejects.toThrow(
        InvalidCredentialsException,
      );

      expect(prismaService.user.update).toHaveBeenCalledTimes(2);
      expect(prismaService.user.update).toHaveBeenLastCalledWith({
        where: { id: userWithFailedAttempts.id },
        data: {
          lockedUntil: expect.any(Date),
        },
      });
    });

    it('should use mobile session timeout when rememberMe is true', async () => {
      // Arrange
      const signInWithRememberMe = { ...validSignInDto, rememberMe: true };
      prismaService.user.findUnique.mockResolvedValue(mockUserForLogin);
      passwordService.validatePassword.mockResolvedValue(true);
      passwordService.generateSecureToken.mockReturnValue('session-token-123');
      prismaService.user.update.mockResolvedValue(mockUserForLogin);
      prismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId: mockUserForLogin.id,
        sessionToken: 'session-token-123',
        deviceInfo: 'Desktop',
        ipAddress: '192.168.1.1',
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });
      redisService.setSession.mockResolvedValue();

      // Act
      const result = await service.signIn(signInWithRememberMe, deviceInfo);

      // Assert
      expect(result.expiresAt.getTime()).toBeGreaterThan(
        Date.now() + 60 * 24 * 60 * 60 * 1000, // More than 60 days
      );
    });

    it('should send login alert for new device', async () => {
      // Arrange
      const userWithDifferentLastIP = {
        ...mockUserForLogin,
        lastLoginIp: '192.168.1.100', // Different IP
      };
      prismaService.user.findUnique.mockResolvedValue(userWithDifferentLastIP);
      passwordService.validatePassword.mockResolvedValue(true);
      passwordService.generateSecureToken.mockReturnValue('session-token-123');
      prismaService.user.update.mockResolvedValue(userWithDifferentLastIP);
      prismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId: userWithDifferentLastIP.id,
        sessionToken: 'session-token-123',
        deviceInfo: 'Desktop',
        ipAddress: '192.168.1.1',
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });
      redisService.setSession.mockResolvedValue();

      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await service.signIn(validSignInDto, deviceInfo);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Login alert'),
      );
    });

    it('should update last login information', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUserForLogin);
      passwordService.validatePassword.mockResolvedValue(true);
      passwordService.generateSecureToken.mockReturnValue('session-token-123');
      prismaService.user.update.mockResolvedValue(mockUserForLogin);
      prismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId: mockUserForLogin.id,
        sessionToken: 'session-token-123',
        deviceInfo: 'Desktop',
        ipAddress: '192.168.1.1',
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });
      redisService.setSession.mockResolvedValue();

      // Act
      await service.signIn(validSignInDto, deviceInfo);

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserForLogin.id },
        data: {
          lastLoginAt: expect.any(Date),
          lastLoginIp: '192.168.1.1',
        },
      });
    });

    it('should create session in both database and Redis', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUserForLogin);
      passwordService.validatePassword.mockResolvedValue(true);
      passwordService.generateSecureToken.mockReturnValue('session-token-123');
      prismaService.user.update.mockResolvedValue(mockUserForLogin);
      prismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId: mockUserForLogin.id,
        sessionToken: 'session-token-123',
        deviceInfo: 'Desktop',
        ipAddress: '192.168.1.1',
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });
      redisService.setSession.mockResolvedValue();

      // Act
      await service.signIn(validSignInDto, deviceInfo);

      // Assert
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserForLogin.id,
          sessionToken: 'session-token-123',
          deviceInfo: 'Desktop',
          ipAddress: '192.168.1.1',
          userAgent: deviceInfo.userAgent,
          expiresAt: expect.any(Date),
        },
      });

      expect(redisService.setSession).toHaveBeenCalledWith(
        'session-token-123',
        expect.objectContaining({
          userId: mockUserForLogin.id,
          deviceInfo: 'Desktop',
          ipAddress: '192.168.1.1',
        }),
        expect.any(Number),
      );
    });
  });
});
