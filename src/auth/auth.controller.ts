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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SignUpDto, SignInDto, AuthResponseDto } from './dto';
import {
  OAuthConfigurationException,
  OAuthTokenExchangeException,
} from './exceptions/auth.exceptions';
import { RateLimit, RateLimitGuard } from './guards';
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
  })
  @ApiResponse({
    status: 409,
    description: 'Username or email already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
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
  })
  @ApiResponse({
    status: 403,
    description: 'Account locked or suspended',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
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
