import { Injectable, NotFoundException } from '@nestjs/common';

import { User } from '@prisma/client';

import { UsernameUnavailableException } from '../auth/exceptions/auth.exceptions';
import { PrismaService } from '../prisma/prisma.service';

import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by username (case-insensitive)
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { usernameLower: username.toLowerCase() },
    });
  }

  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { emailLower: email.toLowerCase() },
    });
  }

  /**
   * Update user profile information
   * Note: birthDate is immutable and cannot be updated
   */
  async updateProfile(
    userId: string,
    updateData: UpdateProfileDto,
  ): Promise<User> {
    // Verify user exists
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update profile with provided data
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: updateData.displayName,
        bio: updateData.bio,
        location: updateData.location,
        websiteUrl: updateData.websiteUrl,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Change username with case-insensitive validation
   */
  async changeUsername(userId: string, newUsername: string): Promise<User> {
    // Verify user exists
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate username format
    this.validateUsernameFormat(newUsername);

    // Check if username is already taken (case-insensitive)
    const existingUser = await this.findByUsername(newUsername);
    if (existingUser && existingUser.id !== userId) {
      const suggestions = await this.generateUsernameSuggestions(newUsername);
      throw new UsernameUnavailableException(newUsername, suggestions);
    }

    // Update username and usernameLower
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        username: newUsername,
        usernameLower: newUsername.toLowerCase(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get user profile (public information)
   */
  async getProfile(
    userId: string,
  ): Promise<
    Omit<
      User,
      | 'password'
      | 'emailVerificationToken'
      | 'passwordResetToken'
      | 'passwordResetExpires'
    >
  > {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove sensitive fields from response
    const {
      password: _password,
      emailVerificationToken: _emailVerificationToken,
      passwordResetToken: _passwordResetToken,
      passwordResetExpires: _passwordResetExpires,
      ...profile
    } = user;
    return profile;
  }

  /**
   * Soft delete user account (deactivation)
   */
  async deactivateAccount(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mark account as suspended (soft delete)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspensionReason: 'Account deactivated by user',
        updatedAt: new Date(),
      },
    });

    // Invalidate all user sessions
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Check if username is available (case-insensitive)
   */
  async isUsernameAvailable(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const existingUser = await this.findByUsername(username);
    if (!existingUser) {
      return true; // Username is available
    }
    if (excludeUserId && existingUser.id === excludeUserId) {
      return true; // Username is taken by the same user (allowed)
    }
    return false; // Username is taken by a different user
  }

  /**
   * Validate username format
   */
  private validateUsernameFormat(username: string): void {
    // Username must be 3-15 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/;

    if (!usernameRegex.test(username)) {
      throw new Error(
        'Username must be 3-15 characters long and contain only letters, numbers, and underscores',
      );
    }

    // Check for blocked usernames (basic list)
    const blockedUsernames = [
      'admin',
      'administrator',
      'root',
      'system',
      'api',
      'www',
      'mail',
      'ftp',
      'support',
      'help',
      'info',
      'contact',
      'about',
      'privacy',
      'terms',
      'twitter',
      'twitterx',
      'x',
      'null',
      'undefined',
      'test',
    ];

    if (blockedUsernames.includes(username.toLowerCase())) {
      throw new Error('This username is not available');
    }
  }

  /**
   * Generate username suggestions when requested username is taken
   */
  private async generateUsernameSuggestions(
    baseUsername: string,
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const maxSuggestions = 3;

    // Generate suggestions by appending numbers
    for (let i = 1; i <= maxSuggestions * 2; i++) {
      const suggestion = `${baseUsername}${i}`;
      if (suggestion.length <= 15) {
        // Respect username length limit
        const isAvailable = await this.isUsernameAvailable(suggestion);
        if (isAvailable) {
          suggestions.push(suggestion);
          if (suggestions.length >= maxSuggestions) break;
        }
      }
    }

    // If we still need more suggestions, try with underscores
    if (suggestions.length < maxSuggestions) {
      for (let i = 1; i <= maxSuggestions; i++) {
        const suggestion = `${baseUsername}_${i}`;
        if (suggestion.length <= 15) {
          const isAvailable = await this.isUsernameAvailable(suggestion);
          if (isAvailable) {
            suggestions.push(suggestion);
            if (suggestions.length >= maxSuggestions) break;
          }
        }
      }
    }

    return suggestions;
  }
}
