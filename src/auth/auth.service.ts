import { Injectable, Logger } from '@nestjs/common';

import { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

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
import { SecurityUtils } from './utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Register a new user with email/password
   */
  async registerUser(signUpDto: SignUpDto): Promise<{
    user: Omit<User, 'password' | 'emailVerificationToken'>;
    emailVerificationToken?: string | undefined;
  }> {
    const { username, email, password, displayName, birthDate } = signUpDto;

    // Validate password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new InvalidPasswordException(passwordValidation.errors);
    }

    // Sanitize inputs
    const sanitizedUsername = SecurityUtils.sanitizeUsername(username);
    const sanitizedEmail = email ? SecurityUtils.sanitizeEmail(email) : null;
    const sanitizedDisplayName = displayName
      ? SecurityUtils.sanitizeText(displayName)
      : null;

    // Generate case-insensitive versions for uniqueness checking
    const usernameLower = sanitizedUsername.toLowerCase();
    const emailLower = sanitizedEmail?.toLowerCase() || null;

    // Check for existing username (case-insensitive)
    const existingUserByUsername = await this.prisma.user.findUnique({
      where: { usernameLower },
    });

    if (existingUserByUsername) {
      const suggestions =
        await this.generateUsernameSuggestions(sanitizedUsername);
      throw new UsernameUnavailableException(sanitizedUsername, suggestions);
    }

    // Check for existing email (case-insensitive) if email is provided
    if (emailLower) {
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { emailLower },
      });

      if (existingUserByEmail) {
        throw new EmailAlreadyExistsException(sanitizedEmail!);
      }
    }

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(password);

    // Generate email verification token if email is provided
    const emailVerificationToken: string | undefined = sanitizedEmail
      ? this.passwordService.generateSecureToken()
      : undefined;

    // Parse birth date if provided
    const parsedBirthDate = birthDate ? new Date(birthDate) : null;

    try {
      // Create user
      const user = await this.prisma.user.create({
        data: {
          username: sanitizedUsername,
          usernameLower,
          email: sanitizedEmail,
          emailLower,
          password: hashedPassword,
          displayName: sanitizedDisplayName,
          birthDate: parsedBirthDate,
          emailVerificationToken,
          emailVerified: !sanitizedEmail, // If no email provided, consider "verified"
        },
      });

      this.logger.log(
        `User registered successfully: ${user.username} (${user.id})`,
      );

      // Return user without sensitive fields

      const {
        password: _password,
        emailVerificationToken: _token,
        ...userWithoutSensitiveData
      } = user;

      return {
        user: userWithoutSensitiveData,
        emailVerificationToken,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to register user: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Generate username suggestions when the requested username is taken
   */
  private async generateUsernameSuggestions(
    baseUsername: string,
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const maxSuggestions = 3;

    // Try adding numbers
    for (let i = 1; i <= maxSuggestions; i++) {
      const suggestion = `${baseUsername}${i}`;
      const exists = await this.prisma.user.findUnique({
        where: { usernameLower: suggestion.toLowerCase() },
      });

      if (!exists) {
        suggestions.push(suggestion);
      }

      if (suggestions.length >= maxSuggestions) break;
    }

    // If we still need more suggestions, try with random numbers
    while (suggestions.length < maxSuggestions) {
      const randomNum = Math.floor(Math.random() * 9999) + 1;
      const suggestion = `${baseUsername}${randomNum}`;
      const exists = await this.prisma.user.findUnique({
        where: { usernameLower: suggestion.toLowerCase() },
      });

      if (!exists && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Check if username is available (case-insensitive)
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const sanitizedUsername = SecurityUtils.sanitizeUsername(username);
    const usernameLower = sanitizedUsername.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { usernameLower },
    });

    return !existingUser;
  }

  /**
   * Check if email is available (case-insensitive)
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const sanitizedEmail = SecurityUtils.sanitizeEmail(email);
    const emailLower = sanitizedEmail.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { emailLower },
    });

    return !existingUser;
  }

  /**
   * Authenticate user with email/username and password
   */
  async signIn(
    signInDto: SignInDto,
    deviceInfo?: {
      ipAddress?: string;
      userAgent?: string;
      deviceInfo?: string;
    },
  ): Promise<{
    user: Omit<User, 'password' | 'emailVerificationToken'>;
    sessionToken: string;
    expiresAt: Date;
  }> {
    const { emailOrUsername, password, rememberMe = false } = signInDto;

    // Sanitize input
    const sanitizedCredential = SecurityUtils.sanitizeText(emailOrUsername);

    // Find user by username or email (case-insensitive)
    const user = await this.findUserByCredential(sanitizedCredential);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Check if account is suspended
    if (user.isSuspended) {
      throw new AccountSuspendedException(user.suspensionReason || undefined);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedException(user.lockedUntil);
    }

    // Verify password
    const isPasswordValid = await this.passwordService.validatePassword(
      password,
      user.password!,
    );

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, deviceInfo?.ipAddress);
      throw new InvalidCredentialsException();
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(user.id);

    // Update last login information
    await this.updateLastLogin(user.id, deviceInfo?.ipAddress);

    // Send login alert if from new device
    if (deviceInfo && this.isNewDevice(user, deviceInfo)) {
      this.sendLoginAlert(user, deviceInfo);
    }

    // Create session
    const sessionData = await this.createSession(
      user.id,
      rememberMe,
      deviceInfo,
    );

    // Return user without sensitive fields
    const {
      password: _password,
      emailVerificationToken: _token,
      ...userWithoutSensitiveData
    } = user;

    this.logger.log(
      `User signed in successfully: ${user.username} (${user.id})`,
    );

    return {
      user: userWithoutSensitiveData,
      sessionToken: sessionData.sessionToken,
      expiresAt: sessionData.expiresAt,
    };
  }

  /**
   * Find user by username or email (case-insensitive)
   */
  private async findUserByCredential(credential: string): Promise<User | null> {
    const lowerCredential = credential.toLowerCase();

    // Try to find by username first
    let user = await this.prisma.user.findUnique({
      where: { usernameLower: lowerCredential },
    });

    // If not found by username, try email
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { emailLower: lowerCredential },
      });
    }

    return user;
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
    const lockoutDurationMinutes = parseInt(
      process.env.LOCKOUT_DURATION_MINUTES || '30',
      10,
    );

    // Increment failed login attempts
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    });

    // Lock account if max attempts exceeded
    if (user.failedLoginAttempts >= maxAttempts) {
      const lockedUntil = new Date(
        Date.now() + lockoutDurationMinutes * 60 * 1000,
      );

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil,
        },
      });

      this.logger.warn(
        `Account locked due to failed login attempts: ${userId} from IP: ${ipAddress}`,
      );
    }

    // Track failed attempts in Redis for rate limiting
    if (ipAddress) {
      await this.redisService.incrementRateLimit(
        `failed_login:${ipAddress}`,
        3600, // 1 hour window
        20, // Max 20 failed attempts per hour per IP
      );
    }
  }

  /**
   * Reset failed login attempts
   */
  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Update last login information
   */
  private async updateLastLogin(
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });
  }

  /**
   * Check if this is a new device for the user
   */
  private isNewDevice(
    user: User,
    deviceInfo: {
      ipAddress?: string;
      userAgent?: string;
      deviceInfo?: string;
    },
  ): boolean {
    // Simple check - if IP address is different from last login
    // In a real implementation, you might want more sophisticated device fingerprinting
    return user.lastLoginIp !== deviceInfo.ipAddress;
  }

  /**
   * Send login alert notification
   */
  private sendLoginAlert(
    user: User,
    deviceInfo: {
      ipAddress?: string;
      userAgent?: string;
      deviceInfo?: string;
    },
  ): void {
    // TODO: Implement email service integration
    // For now, just log the alert
    this.logger.log(
      `Login alert: User ${user.username} (${user.id}) logged in from new device/IP: ${deviceInfo.ipAddress}`,
    );

    // In a real implementation, you would send an email notification here
    // await this.emailService.sendLoginAlert(user, deviceInfo);
  }

  /**
   * Create a new session
   */
  private async createSession(
    userId: string,
    rememberMe: boolean,
    deviceInfo?: {
      ipAddress?: string;
      userAgent?: string;
      deviceInfo?: string;
    },
  ): Promise<{ sessionToken: string; expiresAt: Date }> {
    // Generate secure session token
    const sessionToken = this.passwordService.generateSecureToken();

    // Calculate expiration based on rememberMe and device type
    const webSessionDays = parseInt(
      process.env.WEB_SESSION_TIMEOUT_DAYS || '30',
      10,
    );
    const mobileSessionDays = parseInt(
      process.env.MOBILE_SESSION_TIMEOUT_DAYS || '90',
      10,
    );

    // Use mobile session timeout if rememberMe is true, otherwise web timeout
    const sessionDays = rememberMe ? mobileSessionDays : webSessionDays;
    const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

    // Store session in database
    await this.prisma.session.create({
      data: {
        userId,
        sessionToken,
        deviceInfo: deviceInfo?.deviceInfo,
        ipAddress: deviceInfo?.ipAddress,
        userAgent: deviceInfo?.userAgent,
        expiresAt,
      },
    });

    // Store session in Redis for fast access
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      deviceInfo: deviceInfo?.deviceInfo,
      ipAddress: deviceInfo?.ipAddress,
    };

    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await this.redisService.setSession(sessionToken, sessionData, ttlSeconds);

    return { sessionToken, expiresAt };
  }
}
