import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
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

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

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
    emailVerified: false,
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
    const mockAuthService = {
      registerUser: jest.fn(),
      signIn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const validSignUpDto: SignUpDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'ValidPassword123!',
      displayName: 'Test User',
      birthDate: '1990-01-01',
    };

    it('should successfully register a user with email verification', async () => {
      // Arrange
      const serviceResult = {
        user: mockUser,
        emailVerificationToken: 'verification-token',
      };
      authService.registerUser.mockResolvedValue(serviceResult);

      // Act
      const result = await controller.signUp(validSignUpDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message:
          'Registration successful. Please check your email to verify your account.',
        user: mockUser,
        requiresEmailVerification: true,
      });

      expect(authService.registerUser).toHaveBeenCalledWith(validSignUpDto);
    });

    it('should successfully register a user without email', async () => {
      // Arrange
      const signUpDtoWithoutEmail = { ...validSignUpDto };
      delete signUpDtoWithoutEmail.email;

      const userWithoutEmail = { ...mockUser, email: null, emailLower: null };
      const serviceResult = {
        user: userWithoutEmail,
        emailVerificationToken: undefined,
      };
      authService.registerUser.mockResolvedValue(serviceResult);

      // Act
      const result = await controller.signUp(signUpDtoWithoutEmail);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Registration successful.',
        user: userWithoutEmail,
        requiresEmailVerification: false,
      });

      expect(authService.registerUser).toHaveBeenCalledWith(
        signUpDtoWithoutEmail,
      );
    });

    it('should handle UsernameUnavailableException', async () => {
      // Arrange
      const exception = new UsernameUnavailableException('testuser', [
        'testuser1',
        'testuser2',
      ]);
      authService.registerUser.mockRejectedValue(exception);

      // Act & Assert
      await expect(controller.signUp(validSignUpDto)).rejects.toThrow(
        UsernameUnavailableException,
      );

      expect(authService.registerUser).toHaveBeenCalledWith(validSignUpDto);
    });

    it('should handle EmailAlreadyExistsException', async () => {
      // Arrange
      const exception = new EmailAlreadyExistsException('test@example.com');
      authService.registerUser.mockRejectedValue(exception);

      // Act & Assert
      await expect(controller.signUp(validSignUpDto)).rejects.toThrow(
        EmailAlreadyExistsException,
      );

      expect(authService.registerUser).toHaveBeenCalledWith(validSignUpDto);
    });

    it('should handle InvalidPasswordException', async () => {
      // Arrange
      const exception = new InvalidPasswordException([
        'Password must contain at least one uppercase letter',
      ]);
      authService.registerUser.mockRejectedValue(exception);

      // Act & Assert
      await expect(controller.signUp(validSignUpDto)).rejects.toThrow(
        InvalidPasswordException,
      );

      expect(authService.registerUser).toHaveBeenCalledWith(validSignUpDto);
    });

    it('should handle generic errors', async () => {
      // Arrange
      const genericError = new Error('Database connection failed');
      authService.registerUser.mockRejectedValue(genericError);

      // Act & Assert
      await expect(controller.signUp(validSignUpDto)).rejects.toThrow(
        'Database connection failed',
      );

      expect(authService.registerUser).toHaveBeenCalledWith(validSignUpDto);
    });

    it('should return correct response structure', async () => {
      // Arrange
      const serviceResult = {
        user: mockUser,
        emailVerificationToken: 'verification-token',
      };
      authService.registerUser.mockResolvedValue(serviceResult);

      // Act
      const result = await controller.signUp(validSignUpDto);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('requiresEmailVerification');

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.requiresEmailVerification).toBe('boolean');
      expect(result.user).toEqual(mockUser);
    });

    it('should handle minimal signup data', async () => {
      // Arrange
      const minimalSignUpDto: SignUpDto = {
        username: 'testuser',
        password: 'ValidPassword123!',
      };

      const minimalUser = {
        ...mockUser,
        email: null,
        emailLower: null,
        displayName: null,
        birthDate: null,
      };

      const serviceResult = {
        user: minimalUser,
        emailVerificationToken: undefined,
      };
      authService.registerUser.mockResolvedValue(serviceResult);

      // Act
      const result = await controller.signUp(minimalSignUpDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Registration successful.',
        user: minimalUser,
        requiresEmailVerification: false,
      });

      expect(authService.registerUser).toHaveBeenCalledWith(minimalSignUpDto);
    });
  });

  describe('signIn', () => {
    const validSignInDto: SignInDto = {
      emailOrUsername: 'testuser',
      password: 'ValidPassword123!',
      rememberMe: false,
    };

    const mockRequest = {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    } as any;

    const mockIpAddress = '192.168.1.1';

    const mockSignInResult = {
      user: mockUser,
      sessionToken: 'session-token-123',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    it('should successfully sign in a user', async () => {
      // Arrange
      authService.signIn.mockResolvedValue(mockSignInResult);

      // Act
      const result = await controller.signIn(
        validSignInDto,
        mockRequest,
        mockIpAddress,
      );

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Sign in successful',
        user: mockUser,
        sessionToken: 'session-token-123',
        expiresAt: mockSignInResult.expiresAt,
      });

      expect(authService.signIn).toHaveBeenCalledWith(validSignInDto, {
        ipAddress: mockIpAddress,
        userAgent: mockRequest.headers['user-agent'],
        deviceInfo: 'Desktop',
      });
    });

    it('should extract device info from user agent', async () => {
      // Arrange
      const mobileRequest = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile/15E148',
        },
      } as any;
      authService.signIn.mockResolvedValue(mockSignInResult);

      // Act
      await controller.signIn(validSignInDto, mobileRequest, mockIpAddress);

      // Assert
      expect(authService.signIn).toHaveBeenCalledWith(validSignInDto, {
        ipAddress: mockIpAddress,
        userAgent: mobileRequest.headers['user-agent'],
        deviceInfo: 'Mobile Device',
      });
    });

    it('should handle tablet user agent', async () => {
      // Arrange
      const tabletRequest = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      } as any;
      authService.signIn.mockResolvedValue(mockSignInResult);

      // Act
      await controller.signIn(validSignInDto, tabletRequest, mockIpAddress);

      // Assert
      expect(authService.signIn).toHaveBeenCalledWith(validSignInDto, {
        ipAddress: mockIpAddress,
        userAgent: tabletRequest.headers['user-agent'],
        deviceInfo: 'Tablet',
      });
    });

    it('should handle missing user agent', async () => {
      // Arrange
      const requestWithoutUserAgent = {
        headers: {},
      } as any;
      authService.signIn.mockResolvedValue(mockSignInResult);

      // Act
      await controller.signIn(
        validSignInDto,
        requestWithoutUserAgent,
        mockIpAddress,
      );

      // Assert
      expect(authService.signIn).toHaveBeenCalledWith(validSignInDto, {
        ipAddress: mockIpAddress,
        userAgent: undefined,
        deviceInfo: 'Unknown Device',
      });
    });

    it('should handle InvalidCredentialsException', async () => {
      // Arrange
      const exception = new InvalidCredentialsException();
      authService.signIn.mockRejectedValue(exception);

      // Act & Assert
      await expect(
        controller.signIn(validSignInDto, mockRequest, mockIpAddress),
      ).rejects.toThrow(InvalidCredentialsException);

      expect(authService.signIn).toHaveBeenCalledWith(validSignInDto, {
        ipAddress: mockIpAddress,
        userAgent: mockRequest.headers['user-agent'],
        deviceInfo: 'Desktop',
      });
    });

    it('should handle AccountLockedException', async () => {
      // Arrange
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      const exception = new AccountLockedException(lockedUntil);
      authService.signIn.mockRejectedValue(exception);

      // Act & Assert
      await expect(
        controller.signIn(validSignInDto, mockRequest, mockIpAddress),
      ).rejects.toThrow(AccountLockedException);

      expect(authService.signIn).toHaveBeenCalledWith(validSignInDto, {
        ipAddress: mockIpAddress,
        userAgent: mockRequest.headers['user-agent'],
        deviceInfo: 'Desktop',
      });
    });

    it('should handle AccountSuspendedException', async () => {
      // Arrange
      const exception = new AccountSuspendedException('Terms violation');
      authService.signIn.mockRejectedValue(exception);

      // Act & Assert
      await expect(
        controller.signIn(validSignInDto, mockRequest, mockIpAddress),
      ).rejects.toThrow(AccountSuspendedException);

      expect(authService.signIn).toHaveBeenCalledWith(validSignInDto, {
        ipAddress: mockIpAddress,
        userAgent: mockRequest.headers['user-agent'],
        deviceInfo: 'Desktop',
      });
    });

    it('should handle rememberMe option', async () => {
      // Arrange
      const signInWithRememberMe = { ...validSignInDto, rememberMe: true };
      authService.signIn.mockResolvedValue(mockSignInResult);

      // Act
      await controller.signIn(signInWithRememberMe, mockRequest, mockIpAddress);

      // Assert
      expect(authService.signIn).toHaveBeenCalledWith(signInWithRememberMe, {
        ipAddress: mockIpAddress,
        userAgent: mockRequest.headers['user-agent'],
        deviceInfo: 'Desktop',
      });
    });

    it('should return correct response structure', async () => {
      // Arrange
      authService.signIn.mockResolvedValue(mockSignInResult);

      // Act
      const result = await controller.signIn(
        validSignInDto,
        mockRequest,
        mockIpAddress,
      );

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('sessionToken');
      expect(result).toHaveProperty('expiresAt');

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.sessionToken).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.user).toEqual(mockUser);
    });

    it('should handle generic errors', async () => {
      // Arrange
      const genericError = new Error('Database connection failed');
      authService.signIn.mockRejectedValue(genericError);

      // Act & Assert
      await expect(
        controller.signIn(validSignInDto, mockRequest, mockIpAddress),
      ).rejects.toThrow('Database connection failed');

      expect(authService.signIn).toHaveBeenCalledWith(validSignInDto, {
        ipAddress: mockIpAddress,
        userAgent: mockRequest.headers['user-agent'],
        deviceInfo: 'Desktop',
      });
    });
  });
});
