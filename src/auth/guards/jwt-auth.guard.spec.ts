import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  describe('handleRequest', () => {
    const mockContext = {} as ExecutionContext;
    const mockUser = {
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };

    it('should return user when authentication is successful', () => {
      const result = guard.handleRequest(null, mockUser, null, mockContext);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => {
        guard.handleRequest(null, null, null, mockContext);
      }).toThrow(new UnauthorizedException('Unauthorized'));
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => {
        guard.handleRequest(null, undefined, null, mockContext);
      }).toThrow(new UnauthorizedException('Unauthorized'));
    });

    it('should throw UnauthorizedException with custom message for TokenExpiredError', () => {
      const info = { name: 'TokenExpiredError' };

      expect(() => {
        guard.handleRequest(null, null, info, mockContext);
      }).toThrow(new UnauthorizedException('Token has expired'));
    });

    it('should throw UnauthorizedException with custom message for JsonWebTokenError', () => {
      const info = { name: 'JsonWebTokenError' };

      expect(() => {
        guard.handleRequest(null, null, info, mockContext);
      }).toThrow(new UnauthorizedException('Invalid token'));
    });

    it('should throw UnauthorizedException with custom message for NotBeforeError', () => {
      const info = { name: 'NotBeforeError' };

      expect(() => {
        guard.handleRequest(null, null, info, mockContext);
      }).toThrow(new UnauthorizedException('Token not active'));
    });

    it('should throw UnauthorizedException with error message when error has message', () => {
      const error = { message: 'Custom error message' };

      expect(() => {
        guard.handleRequest(error, null, null, mockContext);
      }).toThrow(new UnauthorizedException('Custom error message'));
    });

    it('should throw UnauthorizedException with default message for unknown error', () => {
      const error = {};

      expect(() => {
        guard.handleRequest(error, null, null, mockContext);
      }).toThrow(new UnauthorizedException('Unauthorized'));
    });

    it('should throw UnauthorizedException with error message over info message', () => {
      const error = { message: 'Error message' };
      const info = { name: 'TokenExpiredError' };

      expect(() => {
        guard.handleRequest(error, null, info, mockContext);
      }).toThrow(new UnauthorizedException('Error message'));
    });

    it('should throw UnauthorizedException when error is present even if user exists', () => {
      const error = { message: 'Some error' };

      expect(() => {
        guard.handleRequest(error, mockUser, null, mockContext);
      }).toThrow(new UnauthorizedException('Some error'));
    });
  });
});
