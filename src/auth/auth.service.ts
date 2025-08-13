import { Injectable, Logger } from '@nestjs/common';

import { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { SignUpDto } from './dto';
import {
  UsernameUnavailableException,
  EmailAlreadyExistsException,
  InvalidPasswordException,
} from './exceptions';
import { PasswordService } from './services';
import { SecurityUtils } from './utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
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
}
