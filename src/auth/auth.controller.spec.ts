import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../redis/redis.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  SignUpDto,
  SignInDto,
  SignOutDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto';
import {
  UsernameUnavailableException,
  EmailAlreadyExistsException,
  InvalidPasswordException,
  InvalidCredentialsException,
  AccountLockedException,
  AccountSuspendedException,
} from './exceptions';
import { GoogleOAuthService, SessionService } from './services';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let googleOAuthService: jest.Mocked<GoogleOAuthService>;

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

  const mockTokens = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
  };

  beforeEach(async () => {
    const mockAuthService = {
      registerUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      signOutAll: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      resendEmailVerification: jest.fn(),
      createSession: jest.fn(),
    };

    const mockGoogleOAuthService = {
      generateAuthUrl: jest.fn(),
      exchangeCodeForTokens: jest.fn(),
      getUserProfile: jest.fn(),
      findOrCreateUser: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incrementRateLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: GoogleOAuthService,
          useValue: mockGoogleOAuthService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: SessionService,
          useValue: {
            createSession: jest.fn(),
            invalidateSession: jest.fn(),
            validateSession: jest.fn(),
            refreshSession: jest.fn(),
            invalidateAllUserSessions: jest.fn(),
            getUserSessions: jest.fn(),
            cleanupExpiredSessions: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    googleOAuthService = module.get(GoogleOAuthService);
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
      tokens: mockTokens,
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

  describe('signOut', () => {
    const validSignOutDto: SignOutDto = {
      signOutAll: false,
    };

    it('should successfully sign out from current session', async () => {
      // Arrange
      const sessionToken = 'session-token-123';
      const authorization = `Bearer ${sessionToken}`;
      authService.signOut.mockResolvedValue(undefined);

      // Act
      const result = await controller.signOut(authorization, validSignOutDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Successfully signed out',
      });

      expect(authService.signOut).toHaveBeenCalledWith(sessionToken);
    });

    it('should successfully sign out from all sessions', async () => {
      // Arrange
      const sessionToken = 'session-token-123';
      const authorization = `Bearer ${sessionToken}`;
      const signOutAllDto: SignOutDto = { signOutAll: true };
      authService.signOut.mockResolvedValue(undefined);

      // Act
      const result = await controller.signOut(authorization, signOutAllDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Successfully signed out from all devices',
      });

      expect(authService.signOut).toHaveBeenCalledWith(sessionToken);
    });

    it('should handle missing authorization header', async () => {
      // Arrange
      const authorization = '';

      // Act
      const result = await controller.signOut(authorization, validSignOutDto);

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'No session token provided',
      });

      expect(authService.signOut).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    const validRequestDto: RequestPasswordResetDto = {
      email: 'test@example.com',
    };

    it('should successfully request password reset', async () => {
      // Arrange
      authService.requestPasswordReset.mockResolvedValue(undefined);

      // Act
      const result = await controller.requestPasswordReset(validRequestDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        validRequestDto.email,
      );
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Service error');
      authService.requestPasswordReset.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.requestPasswordReset(validRequestDto),
      ).rejects.toThrow('Service error');

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        validRequestDto.email,
      );
    });
  });

  describe('resetPassword', () => {
    const validResetDto: ResetPasswordDto = {
      token: 'reset-token-123',
      newPassword: 'NewSecurePassword123!',
    };

    it('should successfully reset password', async () => {
      // Arrange
      authService.resetPassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.resetPassword(validResetDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message:
          'Password reset successful. Please sign in with your new password.',
      });

      expect(authService.resetPassword).toHaveBeenCalledWith(
        validResetDto.token,
        validResetDto.newPassword,
      );
    });

    it('should handle InvalidCredentialsException', async () => {
      // Arrange
      const exception = new InvalidCredentialsException(
        'Invalid or expired reset token',
      );
      authService.resetPassword.mockRejectedValue(exception);

      // Act & Assert
      await expect(controller.resetPassword(validResetDto)).rejects.toThrow(
        InvalidCredentialsException,
      );

      expect(authService.resetPassword).toHaveBeenCalledWith(
        validResetDto.token,
        validResetDto.newPassword,
      );
    });

    it('should handle InvalidPasswordException', async () => {
      // Arrange
      const exception = new InvalidPasswordException(['Password too weak']);
      authService.resetPassword.mockRejectedValue(exception);

      // Act & Assert
      await expect(controller.resetPassword(validResetDto)).rejects.toThrow(
        InvalidPasswordException,
      );

      expect(authService.resetPassword).toHaveBeenCalledWith(
        validResetDto.token,
        validResetDto.newPassword,
      );
    });
  });

  describe('verifyEmail', () => {
    const validVerifyDto: VerifyEmailDto = {
      token: 'verification-token-123',
    };

    it('should successfully verify email', async () => {
      // Arrange
      authService.verifyEmail.mockResolvedValue(undefined);

      // Act
      const result = await controller.verifyEmail(validVerifyDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully.',
      });

      expect(authService.verifyEmail).toHaveBeenCalledWith(
        validVerifyDto.token,
      );
    });

    it('should handle InvalidCredentialsException', async () => {
      // Arrange
      const exception = new InvalidCredentialsException(
        'Invalid verification token',
      );
      authService.verifyEmail.mockRejectedValue(exception);

      // Act & Assert
      await expect(controller.verifyEmail(validVerifyDto)).rejects.toThrow(
        InvalidCredentialsException,
      );

      expect(authService.verifyEmail).toHaveBeenCalledWith(
        validVerifyDto.token,
      );
    });
  });

  describe('resendEmailVerification', () => {
    const validResendDto: ResendVerificationDto = {
      email: 'test@example.com',
    };

    it('should successfully resend email verification', async () => {
      // Arrange
      authService.resendEmailVerification.mockResolvedValue(undefined);

      // Act
      const result = await controller.resendEmailVerification(validResendDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message:
          'If the email exists and is unverified, a verification email has been sent.',
      });

      expect(authService.resendEmailVerification).toHaveBeenCalledWith(
        validResendDto.email,
      );
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Service error');
      authService.resendEmailVerification.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.resendEmailVerification(validResendDto),
      ).rejects.toThrow('Service error');

      expect(authService.resendEmailVerification).toHaveBeenCalledWith(
        validResendDto.email,
      );
    });
  });
});
