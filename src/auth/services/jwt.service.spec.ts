import { JwtService as NestJwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtService, JwtPayload } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;
  let nestJwtService: jest.Mocked<NestJwtService>;

  const mockNestJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: NestJwtService,
          useValue: mockNestJwtService,
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    nestJwtService = module.get(NestJwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const userId = 'user-123';
      const username = 'testuser';
      const email = 'test@example.com';
      const sessionId = 'session-123';

      const mockAccessToken = 'access-token';
      const mockRefreshToken = 'refresh-token';

      nestJwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = service.generateTokens(userId, username, email, sessionId);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 900, // 15 minutes in seconds
        refreshExpiresIn: 604800, // 7 days in seconds
      });

      expect(nestJwtService.sign).toHaveBeenCalledTimes(2);

      // Check access token payload
      expect(nestJwtService.sign).toHaveBeenNthCalledWith(
        1,
        {
          sub: userId,
          username,
          email,
          sessionId,
        },
        {
          expiresIn: '15m',
        },
      );

      // Check refresh token payload
      expect(nestJwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          sub: userId,
          username,
          email,
          sessionId,
          type: 'refresh',
        },
        {
          expiresIn: '7d',
        },
      );
    });

    it('should generate tokens without email and sessionId', () => {
      const userId = 'user-123';
      const username = 'testuser';

      const mockAccessToken = 'access-token';
      const mockRefreshToken = 'refresh-token';

      nestJwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = service.generateTokens(userId, username);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 900,
        refreshExpiresIn: 604800,
      });

      expect(nestJwtService.sign).toHaveBeenNthCalledWith(
        1,
        {
          sub: userId,
          username,
          email: undefined,
          sessionId: undefined,
        },
        {
          expiresIn: '15m',
        },
      );
    });
  });

  describe('validateToken', () => {
    it('should validate and return payload for valid token', () => {
      const token = 'valid-token';
      const mockPayload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234567890 + 900,
      };

      nestJwtService.verify.mockReturnValue(mockPayload);

      const result = service.validateToken(token);

      expect(result).toEqual(mockPayload);
      expect(nestJwtService.verify).toHaveBeenCalledWith(token);
    });

    it('should return null for invalid token', () => {
      const token = 'invalid-token';

      nestJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.validateToken(token);

      expect(result).toBeNull();
      expect(nestJwtService.verify).toHaveBeenCalledWith(token);
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = 'token';
      const mockPayload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        iat: 1234567890,
        exp: 1234567890 + 900,
      };

      nestJwtService.decode.mockReturnValue(mockPayload);

      const result = service.decodeToken(token);

      expect(result).toEqual(mockPayload);
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should return null for invalid token', () => {
      const token = 'invalid-token';

      nestJwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.decodeToken(token);

      expect(result).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload: JwtPayload & { type: string } = {
        sub: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        sessionId: 'session-123',
        type: 'refresh',
        iat: 1234567890,
        exp: 1234567890 + 604800,
      };

      const mockNewAccessToken = 'new-access-token';

      nestJwtService.verify.mockReturnValue(mockPayload);
      nestJwtService.sign.mockReturnValue(mockNewAccessToken);

      const result = service.refreshAccessToken(refreshToken);

      expect(result).toEqual({
        accessToken: mockNewAccessToken,
        expiresIn: 900,
      });

      expect(nestJwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(nestJwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockPayload.sub,
          username: mockPayload.username,
          email: mockPayload.email,
          sessionId: mockPayload.sessionId,
        },
        {
          expiresIn: '15m',
        },
      );
    });

    it('should return null for invalid refresh token', () => {
      const refreshToken = 'invalid-refresh-token';

      nestJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });

    it('should return null for non-refresh token', () => {
      const refreshToken = 'access-token';
      const mockPayload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        iat: 1234567890,
        exp: 1234567890 + 900,
      };

      nestJwtService.verify.mockReturnValue(mockPayload);

      const result = service.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });
  });

  describe('getTokenExpirationTime', () => {
    it('should return expiration time in seconds', () => {
      const token = 'token';
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + 900; // 15 minutes from now

      const mockPayload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        exp: expirationTime,
      };

      nestJwtService.decode.mockReturnValue(mockPayload);

      const result = service.getTokenExpirationTime(token);

      expect(result).toBeCloseTo(900, -1); // Allow some variance for test execution time
    });

    it('should return null for token without expiration', () => {
      const token = 'token';
      const mockPayload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
      };

      nestJwtService.decode.mockReturnValue(mockPayload);

      const result = service.getTokenExpirationTime(token);

      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const token = 'expired-token';
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime - 100; // Expired 100 seconds ago

      const mockPayload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        exp: expirationTime,
      };

      nestJwtService.decode.mockReturnValue(mockPayload);

      const result = service.isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should return false for valid token', () => {
      const token = 'valid-token';
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + 900; // Expires in 15 minutes

      const mockPayload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        exp: expirationTime,
      };

      nestJwtService.decode.mockReturnValue(mockPayload);

      const result = service.isTokenExpired(token);

      expect(result).toBe(false);
    });
  });
});
