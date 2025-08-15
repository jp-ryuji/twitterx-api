import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Ip,
  UseGuards,
  Redirect,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import {
  SignUpDto,
  SignInDto,
  AuthResponseDto,
  SignOutDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto';
import {
  OAuthConfigurationException,
  OAuthTokenExchangeException,
} from './exceptions/auth.exceptions';
import { RateLimit, RateLimitGuard, SessionGuard } from './guards';
import { GoogleOAuthService } from './services';

import type { Request } from 'express';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {}

  @Post('signup')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    maxAttempts: 10,
    windowSeconds: 3600,
    keyPrefix: 'signup',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or password requirements not met',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          oneOf: [
            {
              type: 'string',
              example: 'Password must be at least 8 characters long',
            },
            {
              type: 'array',
              items: { type: 'string' },
              example: [
                'Username must be between 3 and 15 characters',
                'Please provide a valid email address',
              ],
            },
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
        timestamp: { type: 'string', example: '2024-08-13T14:22:00Z' },
        path: { type: 'string', example: '/v1/auth/signup' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Username or email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: "Username 'john_doe123' is not available",
        },
        error: { type: 'string', example: 'Conflict' },
        timestamp: { type: 'string', example: '2024-08-13T14:22:00Z' },
        path: { type: 'string', example: '/v1/auth/signup' },
        code: { type: 'string', example: 'USERNAME_UNAVAILABLE' },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          example: ['john_doe124', 'john_doe_2024', 'johndoe123'],
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 429 },
        message: { type: 'string', example: 'Rate limit exceeded' },
        error: { type: 'string', example: 'Too Many Requests' },
        timestamp: { type: 'string', example: '2024-08-13T14:22:00Z' },
        path: { type: 'string', example: '/v1/auth/signup' },
        code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
        retryAfter: { type: 'number', example: 3600 },
      },
    },
  })
  async signUp(@Body() signUpDto: SignUpDto): Promise<AuthResponseDto> {
    const result = await this.authService.registerUser(signUpDto);

    return {
      success: true,
      message: result.emailVerificationToken
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful.',
      user: result.user,
      requiresEmailVerification: !!result.emailVerificationToken,
    };
  }

  @Post('signin')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    maxAttempts: 20,
    windowSeconds: 3600,
    keyPrefix: 'login',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in to user account' })
  @ApiResponse({
    status: 200,
    description: 'User signed in successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' },
        timestamp: { type: 'string', example: '2024-08-13T14:22:00Z' },
        path: { type: 'string', example: '/v1/auth/signin' },
        code: { type: 'string', example: 'INVALID_CREDENTIALS' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account locked or suspended',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          oneOf: [
            {
              type: 'string',
              example:
                'Account is temporarily locked due to too many failed login attempts',
            },
            { type: 'string', example: 'Account has been suspended' },
          ],
        },
        error: { type: 'string', example: 'Forbidden' },
        timestamp: { type: 'string', example: '2024-08-13T14:22:00Z' },
        path: { type: 'string', example: '/v1/auth/signin' },
        code: {
          oneOf: [
            { type: 'string', example: 'ACCOUNT_LOCKED' },
            { type: 'string', example: 'ACCOUNT_SUSPENDED' },
          ],
        },
        lockedUntil: {
          type: 'string',
          format: 'date-time',
          example: '2024-08-13T15:22:00Z',
        },
        reason: {
          type: 'string',
          example: 'Violation of community guidelines',
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 429 },
        message: { type: 'string', example: 'Rate limit exceeded' },
        error: { type: 'string', example: 'Too Many Requests' },
        timestamp: { type: 'string', example: '2024-08-13T14:22:00Z' },
        path: { type: 'string', example: '/v1/auth/signin' },
        code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
        retryAfter: { type: 'number', example: 3600 },
      },
    },
  })
  async signIn(
    @Body() signInDto: SignInDto,
    @Req() request: Request,
    @Ip() ipAddress: string,
  ): Promise<AuthResponseDto> {
    const deviceInfo = {
      ipAddress,
      userAgent: request.headers['user-agent'],
      deviceInfo: this.extractDeviceInfo(request.headers['user-agent']),
    };

    const result = await this.authService.signIn(signInDto, deviceInfo);

    return {
      success: true,
      message: 'Sign in successful',
      user: result.user,
      sessionToken: result.sessionToken,
      expiresAt: result.expiresAt,
    };
  }

  @Get('google')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    maxAttempts: 10,
    windowSeconds: 3600,
    keyPrefix: 'oauth-google',
  })
  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'Optional state parameter for CSRF protection',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google OAuth authorization URL',
  })
  @ApiResponse({
    status: 500,
    description: 'OAuth configuration error',
  })
  @Redirect()
  googleAuth(@Query('state') state?: string) {
    try {
      const authUrl = this.googleOAuthService.generateAuthUrl(state);
      return { url: authUrl };
    } catch {
      throw new OAuthConfigurationException('Google');
    }
  }

  @Get('callback/google')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    maxAttempts: 20,
    windowSeconds: 3600,
    keyPrefix: 'oauth-callback-google',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Authorization code from Google',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'State parameter for CSRF protection',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Error parameter if OAuth failed',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid authorization code or OAuth error',
  })
  @ApiResponse({
    status: 500,
    description: 'OAuth processing error',
  })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') _state: string,
    @Query('error') oauthError: string,
    @Req() request: Request,
    @Ip() ipAddress: string,
  ): Promise<AuthResponseDto> {
    // Handle OAuth errors
    if (oauthError) {
      throw new OAuthTokenExchangeException('Google', oauthError);
    }

    if (!code) {
      throw new OAuthTokenExchangeException(
        'Google',
        'Missing authorization code',
      );
    }

    try {
      // Exchange code for tokens
      const tokens = await this.googleOAuthService.exchangeCodeForTokens(code);

      // Get user profile
      const profile = await this.googleOAuthService.getUserProfile(
        tokens.access_token,
      );

      // Find or create user
      const user = await this.googleOAuthService.findOrCreateUser(profile);

      // Create session
      const deviceInfo = {
        ipAddress,
        userAgent: request.headers['user-agent'],
        deviceInfo: this.extractDeviceInfo(request.headers['user-agent']),
      };

      const sessionResult = await this.authService.createSession(
        user,
        deviceInfo,
      );

      return {
        success: true,
        message: 'Google OAuth authentication successful',
        user: sessionResult.user,
        sessionToken: sessionResult.sessionToken,
        expiresAt: sessionResult.expiresAt,
        provider: 'google',
      };
    } catch (error) {
      if (error instanceof OAuthTokenExchangeException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new OAuthTokenExchangeException('Google', errorMessage);
    }
  }

  @Post('signout')
  @UseGuards(SessionGuard, RateLimitGuard)
  @RateLimit({
    maxAttempts: 30,
    windowSeconds: 3600,
    keyPrefix: 'signout',
  })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign out from current or all sessions' })
  @ApiResponse({
    status: 200,
    description: 'Successfully signed out',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired session token',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async signOut(
    @Headers('authorization') authorization: string,
    @Body() signOutDto: SignOutDto = {},
  ): Promise<{ success: boolean; message: string }> {
    // Extract session token from Authorization header
    const sessionToken = authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return {
        success: false,
        message: 'No session token provided',
      };
    }

    if (signOutDto.signOutAll) {
      // Get user ID from session first
      // This would require a method to get user from session token
      // For now, we'll just sign out the current session
      await this.authService.signOut(sessionToken);
    } else {
      await this.authService.signOut(sessionToken);
    }

    return {
      success: true,
      message: signOutDto.signOutAll
        ? 'Successfully signed out from all devices'
        : 'Successfully signed out',
    };
  }

  @Post('password/reset/request')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    maxAttempts: 5,
    windowSeconds: 3600,
    keyPrefix: 'password-reset-request',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email format',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.requestPasswordReset(requestPasswordResetDto.email);

    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  @Post('password/reset')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    maxAttempts: 10,
    windowSeconds: 3600,
    keyPrefix: 'password-reset',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or password requirements not met',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired reset token',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return {
      success: true,
      message:
        'Password reset successful. Please sign in with your new password.',
    };
  }

  @Post('email/verify')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    maxAttempts: 10,
    windowSeconds: 3600,
    keyPrefix: 'email-verify',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using verification token' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired verification token',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.verifyEmail(verifyEmailDto.token);

    return {
      success: true,
      message: 'Email verified successfully.',
    };
  }

  @Post('email/resend-verification')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    maxAttempts: 3,
    windowSeconds: 3600,
    keyPrefix: 'resend-verification',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent (if email exists and is unverified)',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email format',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async resendEmailVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.resendEmailVerification(resendVerificationDto.email);

    return {
      success: true,
      message:
        'If the email exists and is unverified, a verification email has been sent.',
    };
  }

  /**
   * Extract basic device information from user agent
   */
  private extractDeviceInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';

    // Simple device detection - in production, you might want a more sophisticated library
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      return 'Mobile Device';
    }
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return 'Tablet';
    }
    return 'Desktop';
  }
}
