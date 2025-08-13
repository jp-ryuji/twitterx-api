import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SignUpDto, AuthResponseDto } from './dto';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
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
}
