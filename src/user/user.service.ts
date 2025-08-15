import { Injectable, NotFoundException } from '@nestjs/common';

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
   * Admin: Perform moderation action on user account
   */
  async performModerationAction(
    targetUserId: string,
    moderationDto: AdminModerationDto,
    adminUserId: string,
  ): Promise<User> {
    // Verify target user exists
    const targetUser = await this.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Verify admin user exists and has permissions (basic check)
    const adminUser = await this.findById(adminUserId);
    if (!adminUser) {
      throw new InsufficientPermissionsException('moderation');
    }

    // For now, we'll assume any authenticated user can perform moderation
    // In a real system, you'd check for admin roles/permissions

    const updateData: Partial<User> = { updatedAt: new Date() };

    switch (moderationDto.action) {
      case ModerationAction.SUSPEND:
        updateData.isSuspended = true;
        updateData.suspensionReason =
          moderationDto.reason || 'Account suspended by administrator';
        break;

      case ModerationAction.UNSUSPEND:
        updateData.isSuspended = false;
        updateData.suspensionReason = null;
        break;

      case ModerationAction.VERIFY:
        updateData.isVerified = true;
        break;

      case ModerationAction.UNVERIFY:
        updateData.isVerified = false;
        break;

      case ModerationAction.SHADOW_BAN:
        updateData.isShadowBanned = true;
        updateData.shadowBanReason =
          moderationDto.reason || 'Shadow banned by administrator';
        break;

      case ModerationAction.UNSHADOW_BAN:
        updateData.isShadowBanned = false;
        updateData.shadowBanReason = null;
        break;

      default:
        throw new Error(
          `Unknown moderation action: ${String(moderationDto.action)}`,
        );
    }

    // Update user with moderation action
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    // If suspending, invalidate all user sessions
    if (moderationDto.action === ModerationAction.SUSPEND) {
      await this.prisma.session.deleteMany({
        where: { userId: targetUserId },
      });
    }

    return updatedUser;
  }

  /**
   * Report suspicious activity for a user
   */
  async reportSuspiciousActivity(
    userId: string,
    activityDto: SuspiciousActivityDto,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Increment suspicious activity counter
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        suspiciousActivityCount: { increment: 1 },
        lastSuspiciousActivity: new Date(),
        updatedAt: new Date(),
      },
    });

    // Auto-restrict if threshold is reached or if explicitly requested
    const suspiciousThreshold = 5; // Configurable threshold
    if (
      activityDto.autoRestrict ||
      updatedUser.suspiciousActivityCount >= suspiciousThreshold
    ) {
      await this.applyShadowBan(
        userId,
        `Automatic restriction due to suspicious activity: ${activityDto.activityType}`,
      );
    }
  }

  /**
   * Apply shadow ban to user
   */
  async applyShadowBan(userId: string, reason: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isShadowBanned: true,
        shadowBanReason: reason,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Check if user is shadow banned and throw exception if so
   */
  async checkShadowBanStatus(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (user?.isShadowBanned) {
      throw new ShadowBannedException();
    }
  }

  /**
   * Check if user account is suspended and throw exception if so
   */
  async checkAccountStatus(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSuspended) {
      throw new AccountSuspendedException(user.suspensionReason || undefined);
    }

    if (user.isShadowBanned) {
      throw new ShadowBannedException();
    }
  }

  /**
   * Get user moderation history/status (admin only)
   */
  async getModerationStatus(userId: string): Promise<{
    isSuspended: boolean;
    suspensionReason: string | null;
    isVerified: boolean;
    isShadowBanned: boolean;
    shadowBanReason: string | null;
    suspiciousActivityCount: number;
    lastSuspiciousActivity: Date | null;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
  }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      isSuspended: user.isSuspended,
      suspensionReason: user.suspensionReason,
      isVerified: user.isVerified,
      isShadowBanned: user.isShadowBanned,
      shadowBanReason: user.shadowBanReason,
      suspiciousActivityCount: user.suspiciousActivityCount,
      lastSuspiciousActivity: user.lastSuspiciousActivity,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
    };
  }

  /**
   * Detect suspicious login patterns
   */
  async detectSuspiciousLogin(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    let suspicious = false;
    const suspiciousReasons: string[] = [];

    // Check for IP address changes
    if (user.lastLoginIp && user.lastLoginIp !== ipAddress) {
      // Simple heuristic: if IP changed and it's been less than 1 hour since last login
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (user.lastLoginAt && user.lastLoginAt > oneHourAgo) {
        suspicious = true;
        suspiciousReasons.push('rapid_ip_change');
      }
    }

    // Check for multiple failed attempts recently
    if (user.failedLoginAttempts >= 3) {
      suspicious = true;
      suspiciousReasons.push('multiple_failed_attempts');
    }

    // If suspicious activity detected, report it
    if (suspicious) {
      await this.reportSuspiciousActivity(userId, {
        activityType: suspiciousReasons.join(','),
        details: `IP: ${ipAddress}, UserAgent: ${userAgent}`,
        autoRestrict: false, // Don't auto-restrict on login suspicion
      });
    }

    return suspicious;
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
