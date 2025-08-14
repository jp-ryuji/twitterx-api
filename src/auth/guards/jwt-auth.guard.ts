import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, _context: ExecutionContext) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      let message = 'Unauthorized';

      // Prioritize error message over info message
      if (err && typeof err === 'object' && 'message' in err) {
        message = String((err as { message: string }).message);
      } else if (info && typeof info === 'object' && 'name' in info) {
        const infoName = (info as { name: string }).name;
        if (infoName === 'TokenExpiredError') {
          message = 'Token has expired';
        } else if (infoName === 'JsonWebTokenError') {
          message = 'Invalid token';
        } else if (infoName === 'NotBeforeError') {
          message = 'Token not active';
        }
      }

      throw new UnauthorizedException(message);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
