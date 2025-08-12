import { Controller } from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Authentication endpoints will be implemented in subsequent tasks
}
