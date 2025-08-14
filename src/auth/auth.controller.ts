import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SignUpDto, SignInDto, AuthResponseDto } from './dto';
import { RateLimit, RateLimitGuard } from './guards';

import type { Request } from 'express';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
