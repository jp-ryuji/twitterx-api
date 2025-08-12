import { Controller } from '@nestjs/common';

import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // User management endpoints will be implemented in subsequent tasks
}
