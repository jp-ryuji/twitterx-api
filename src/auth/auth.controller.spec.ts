import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto';
import {
  UsernameUnavailableException,
  EmailAlreadyExistsException,
  InvalidPasswordException,
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
});
