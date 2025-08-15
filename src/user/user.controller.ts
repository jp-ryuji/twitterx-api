import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionService, SessionInfo } from '../auth/services/session.service';
import { PrismaService } from '../prisma/prisma.service';

import {
  AdminModerationDto,
  SuspiciousActivityDto,
} from './dto/admin-moderation.dto';
import { ChangeUsernameDto } from './dto/change-username.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserService } from './user.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    email?: string;
    sessionId: string;
  };
}

@ApiTags('User Management')
@Controller('v1/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the current user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clx1234567890abcdef' },
        username: { type: 'string', example: 'john_doe123' },
        usernameLower: { type: 'string', example: 'john_doe123' },
        email: {
          type: 'string',
          nullable: true,
          example: 'john.doe@example.com',
        },
        emailLower: {
          type: 'string',
          nullable: true,
          example: 'john.doe@example.com',
        },
        displayName: { type: 'string', nullable: true, example: 'John Doe' },
        bio: {
          type: 'string',
          nullable: true,
          example: 'Software developer passionate about technology.',
        },
        location: {
          type: 'string',
          nullable: true,
          example: 'San Francisco, CA',
        },
        websiteUrl: {
          type: 'string',
          nullable: true,
          example: 'https://johndoe.dev',
        },
        profilePicturePath: {
          type: 'string',
          nullable: true,
          example: '/uploads/profiles/user123.jpg',
        },
        headerImagePath: {
          type: 'string',
          nullable: true,
          example: '/uploads/headers/user123.jpg',
        },
        birthDate: {
          type: 'string',
          format: 'date',
          nullable: true,
          example: '1990-01-15',
        },
        followerCount: { type: 'number', example: 150 },
        followingCount: { type: 'number', example: 75 },
        tweetCount: { type: 'number', example: 42 },
        isVerified: { type: 'boolean', example: false },
        isPrivate: { type: 'boolean', example: false },
        isSuspended: { type: 'boolean', example: false },
        suspensionReason: { type: 'string', nullable: true, example: null },
        emailVerified: { type: 'boolean', example: true },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-08-13T14:22:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
        timestamp: { type: 'string', example: '2024-08-13T14:22:00Z' },
        path: { type: 'string', example: '/v1/users/profile' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' },
        timestamp: { type: 'string', example: '2024-08-13T14:22:00Z' },
        path: { type: 'string', example: '/v1/users/profile' },
      },
    },
  })
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.userService.getProfile(req.user.userId);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update user profile information. Note: birthDate cannot be updated after registration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        displayName: { type: 'string', nullable: true },
        bio: { type: 'string', nullable: true },
        location: { type: 'string', nullable: true },
        websiteUrl: { type: 'string', nullable: true },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.userService.updateProfile(
      req.user.userId,
      updateProfileDto,
    );

    // Return only relevant fields for the response
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      bio: updatedUser.bio,
      location: updatedUser.location,
      websiteUrl: updatedUser.websiteUrl,
      updatedAt: updatedUser.updatedAt,
    };
  }

  @Put('username')
  @ApiOperation({
    summary: 'Change username',
    description:
      'Change the user username. Username must be unique and follow format requirements.',
  })
  @ApiResponse({
    status: 200,
    description: 'Username changed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        usernameLower: { type: 'string' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid username format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Username already taken',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
        },
        code: { type: 'string' },
      },
    },
  })
  async changeUsername(
    @Request() req: AuthenticatedRequest,
    @Body() changeUsernameDto: ChangeUsernameDto,
  ) {
    const updatedUser = await this.userService.changeUsername(
      req.user.userId,
      changeUsernameDto.username,
    );

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      usernameLower: updatedUser.usernameLower,
      updatedAt: updatedUser.updatedAt,
    };
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'List active sessions',
    description: 'Get all active sessions for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          deviceInfo: { type: 'string', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          userAgent: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          lastUsedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean' },
          isCurrent: { type: 'boolean' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getSessions(
    @Request() req: AuthenticatedRequest,
  ): Promise<Array<SessionInfo & { isCurrent: boolean }>> {
    const sessions = await this.sessionService.getUserSessions(req.user.userId);

    // Mark the current session
    return sessions.map((session) => ({
      ...session,
      isCurrent: session.sessionId === req.user.sessionId,
    }));
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke a specific session',
    description: 'Revoke a specific session by session ID',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'The ID of the session to revoke',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Session revoked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid session ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot revoke session belonging to another user',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async revokeSession(
    @Request() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    // First, verify that the session belongs to the current user
    const userSessions = await this.sessionService.getUserSessions(
      req.user.userId,
    );
    const sessionToRevoke = userSessions.find(
      (session) => session.sessionId === sessionId,
    );

    if (!sessionToRevoke) {
      // Session not found or doesn't belong to the user
      return; // Return silently for security (don't reveal if session exists)
    }

    // Get the session token to invalidate it
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { sessionToken: true },
    });

    if (session) {
      await this.sessionService.invalidateSession(session.sessionToken);
    }
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke all sessions',
    description:
      'Revoke all sessions for the current user except the current one',
  })
  @ApiResponse({
    status: 204,
    description: 'All other sessions revoked successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async revokeAllSessions(@Request() req: AuthenticatedRequest): Promise<void> {
    // Get all user sessions
    const userSessions = await this.sessionService.getUserSessions(
      req.user.userId,
    );

    // Revoke all sessions except the current one
    for (const session of userSessions) {
      if (session.sessionId !== req.user.sessionId) {
        const sessionData = await this.prisma.session.findUnique({
          where: { id: session.sessionId },
          select: { sessionToken: true },
        });

        if (sessionData) {
          await this.sessionService.invalidateSession(sessionData.sessionToken);
        }
      }
    }
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate account',
    description:
      'Deactivate the user account (soft delete). This will suspend the account and invalidate all sessions.',
  })
  @ApiResponse({
    status: 204,
    description: 'Account deactivated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deactivateAccount(@Request() req: AuthenticatedRequest): Promise<void> {
    await this.userService.deactivateAccount(req.user.userId);
  }

  // Admin endpoints for moderation
  @Post('admin/moderate/:userId')
  @ApiTags('Admin - User Moderation')
  @ApiOperation({
    summary: 'Perform moderation action on user',
    description:
      'Admin endpoint to suspend, verify, or apply other moderation actions to a user account',
  })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to moderate',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Moderation action applied successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        isSuspended: { type: 'boolean' },
        suspensionReason: { type: 'string', nullable: true },
        isVerified: { type: 'boolean' },
        isShadowBanned: { type: 'boolean' },
        shadowBanReason: { type: 'string', nullable: true },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async moderateUser(
    @Request() req: AuthenticatedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() moderationDto: AdminModerationDto,
  ) {
    const updatedUser = await this.userService.performModerationAction(
      userId,
      moderationDto,
      req.user.userId,
    );

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      isSuspended: updatedUser.isSuspended,
      suspensionReason: updatedUser.suspensionReason,
      isVerified: updatedUser.isVerified,
      isShadowBanned: updatedUser.isShadowBanned,
      shadowBanReason: updatedUser.shadowBanReason,
      updatedAt: updatedUser.updatedAt,
    };
  }

  @Get('admin/moderation-status/:userId')
  @ApiTags('Admin - User Moderation')
  @ApiOperation({
    summary: 'Get user moderation status',
    description:
      'Admin endpoint to view moderation status and history for a user',
  })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to check',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User moderation status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isSuspended: { type: 'boolean' },
        suspensionReason: { type: 'string', nullable: true },
        isVerified: { type: 'boolean' },
        isShadowBanned: { type: 'boolean' },
        shadowBanReason: { type: 'string', nullable: true },
        suspiciousActivityCount: { type: 'number' },
        lastSuspiciousActivity: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        failedLoginAttempts: { type: 'number' },
        lockedUntil: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getModerationStatus(
    @Request() req: AuthenticatedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.userService.getModerationStatus(userId);
  }

  @Post('admin/report-suspicious/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Admin - Security')
  @ApiOperation({
    summary: 'Report suspicious activity',
    description: 'Report suspicious activity for a user account',
  })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user with suspicious activity',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Suspicious activity reported successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async reportSuspiciousActivity(
    @Request() req: AuthenticatedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() activityDto: SuspiciousActivityDto,
  ): Promise<void> {
    await this.userService.reportSuspiciousActivity(userId, activityDto);
  }
}
