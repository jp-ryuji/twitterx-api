import {
  Controller,
  Get,
  Put,
  Delete,
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
        id: { type: 'string' },
        username: { type: 'string' },
        usernameLower: { type: 'string' },
        email: { type: 'string', nullable: true },
        emailLower: { type: 'string', nullable: true },
        displayName: { type: 'string', nullable: true },
        bio: { type: 'string', nullable: true },
        location: { type: 'string', nullable: true },
        websiteUrl: { type: 'string', nullable: true },
        profilePicturePath: { type: 'string', nullable: true },
        headerImagePath: { type: 'string', nullable: true },
        birthDate: { type: 'string', format: 'date', nullable: true },
        followerCount: { type: 'number' },
        followingCount: { type: 'number' },
        tweetCount: { type: 'number' },
        isVerified: { type: 'boolean' },
        isPrivate: { type: 'boolean' },
        isSuspended: { type: 'boolean' },
        suspensionReason: { type: 'string', nullable: true },
        emailVerified: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
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
}
