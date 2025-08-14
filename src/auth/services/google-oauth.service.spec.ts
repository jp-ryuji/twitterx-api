import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthProvider } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import {
  GoogleOAuthService,
  GoogleUserProfile,
  GoogleOAuthTokens,
} from './google-oauth.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('GoogleOAuthService', () => {
  let service: GoogleOAuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig = {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3000/v1/auth/callback/google',
  };

  const mockGoogleProfile: GoogleUserProfile = {
    id: 'google-user-id-123',
    email: 'test@example.com',
    verified_email: true,
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://example.com/picture.jpg',
    locale: 'en',
  };

  const mockTokens: GoogleOAuthTokens = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      userOAuthProvider: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string) => mockConfig[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GoogleOAuthService>(GoogleOAuthService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('generateAuthUrl', () => {
    it('should generate correct Google OAuth URL', () => {
      const url = service.generateAuthUrl();

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain(
        'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fv1%2Fauth%2Fcallback%2Fgoogle',
      );
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should include state parameter when provided', () => {
      const state = 'test-state-123';
      const url = service.generateAuthUrl(state);

      expect(url).toContain(`state=${state}`);
    });

    it('should throw error when configuration is missing', () => {
      configService.get.mockReturnValue(undefined);

      expect(() => service.generateAuthUrl()).toThrow(
        'Google OAuth configuration is missing',
      );
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should successfully exchange code for tokens', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokens),
      });

      const result = await service.exchangeCodeForTokens('test-code');

      expect(fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.stringContaining('code=test-code'),
        }),
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw error when token exchange fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      });

      await expect(
        service.exchangeCodeForTokens('invalid-code'),
      ).rejects.toThrow('Failed to exchange code for tokens: 400');
    });

    it('should throw error when configuration is missing', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.exchangeCodeForTokens('test-code')).rejects.toThrow(
        'Google OAuth configuration is missing',
      );
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.exchangeCodeForTokens('test-code')).rejects.toThrow(
        'Failed to exchange authorization code for tokens',
      );
    });
  });

  describe('getUserProfile', () => {
    it('should successfully fetch user profile', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGoogleProfile),
      });

      const result = await service.getUserProfile('test-access-token');

      expect(fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        }),
      );
      expect(result).toEqual(mockGoogleProfile);
    });

    it('should throw error when profile fetch fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      });

      await expect(service.getUserProfile('invalid-token')).rejects.toThrow(
        'Failed to fetch user profile: 401',
      );
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getUserProfile('test-token')).rejects.toThrow(
        'Failed to fetch user profile from Google',
      );
    });
  });

  describe('findOrCreateUser', () => {
    it('should return existing user when OAuth provider exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockOAuthProvider = {
        id: 'oauth-123',
        email: 'test@example.com',
        user: mockUser,
      };

      prismaService.userOAuthProvider.findUnique.mockResolvedValue(
        mockOAuthProvider as any,
      );

      const result = await service.findOrCreateUser(mockGoogleProfile);

      expect(prismaService.userOAuthProvider.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerId: {
            provider: AuthProvider.GOOGLE,
            providerId: mockGoogleProfile.id,
          },
        },
        include: { user: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should update OAuth provider email if changed', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockOAuthProvider = {
        id: 'oauth-123',
        email: 'old@example.com', // Different email
        user: mockUser,
      };

      prismaService.userOAuthProvider.findUnique.mockResolvedValue(
        mockOAuthProvider as any,
      );

      const result = await service.findOrCreateUser(mockGoogleProfile);

      expect(prismaService.userOAuthProvider.update).toHaveBeenCalledWith({
        where: { id: 'oauth-123' },
        data: { email: mockGoogleProfile.email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should link Google OAuth to existing user with same email', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      prismaService.userOAuthProvider.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.findOrCreateUser(mockGoogleProfile);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailLower: mockGoogleProfile.email.toLowerCase() },
      });
      expect(prismaService.userOAuthProvider.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          provider: AuthProvider.GOOGLE,
          providerId: mockGoogleProfile.id,
          email: mockGoogleProfile.email,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should create new user when no existing user found', async () => {
      const mockNewUser = {
        id: 'new-user-123',
        username: 'test',
        email: 'test@example.com',
      };

      prismaService.userOAuthProvider.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique
        .mockResolvedValueOnce(null) // No existing user with email
        .mockResolvedValueOnce(null); // Username is available
      prismaService.user.create.mockResolvedValue(mockNewUser as any);

      const result = await service.findOrCreateUser(mockGoogleProfile);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'test',
          usernameLower: 'test',
          email: mockGoogleProfile.email,
          emailLower: mockGoogleProfile.email.toLowerCase(),
          displayName: mockGoogleProfile.name,
          emailVerified: mockGoogleProfile.verified_email,
          oauthProviders: {
            create: {
              provider: AuthProvider.GOOGLE,
              providerId: mockGoogleProfile.id,
              email: mockGoogleProfile.email,
            },
          },
        },
      });
      expect(result).toEqual(mockNewUser);
    });

    it('should generate unique username when base name is taken', async () => {
      const mockNewUser = {
        id: 'new-user-123',
        username: 'test1',
        email: 'test@example.com',
      };

      prismaService.userOAuthProvider.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique
        .mockResolvedValueOnce(null) // No existing user with email
        .mockResolvedValueOnce({ id: 'existing' } as any) // 'test' is taken
        .mockResolvedValueOnce(null); // 'test1' is available
      prismaService.user.create.mockResolvedValue(mockNewUser as any);

      const result = await service.findOrCreateUser(mockGoogleProfile);

      expect(result).toEqual(mockNewUser);
    });
  });

  describe('validateAccessToken', () => {
    it('should return true for valid token', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          audience: 'test-client-id',
        }),
      });

      const result = await service.validateAccessToken('valid-token');

      expect(fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=valid-token',
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const result = await service.validateAccessToken('invalid-token');

      expect(result).toBe(false);
    });

    it('should return false for token with wrong audience', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          audience: 'wrong-client-id',
        }),
      });

      const result = await service.validateAccessToken('token-for-other-app');

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.validateAccessToken('test-token');

      expect(result).toBe(false);
    });
  });
});
