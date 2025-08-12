import { Controller } from '@nestjs/common';

import { UserService } from './user.service';

@Controller('v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // User management endpoints will be implemented in subsequent tasks
}
