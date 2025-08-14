import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { GoogleOAuthService } from '../services/google-oauth.service';

import { GoogleOAuthStrategy } from './google-oauth.strategy';

describe('GoogleOAuthStrategy', () => {
  let strategy: GoogleOAuthStrategy;
  let googleOAuthService: jest.Mocked<GoogleOAuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig = {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3000/v1/auth/callback/google',
  };

  const mockPassportProfile = {
    id: 'google-user-id-123',
    displayName: 'Test User',
    name: {
      givenName: 'Test',
      familyName: 'User',
    },
    emails: [
      {
        value: 'test@example.com',
        verified: true,
      },
    ],
    photos: [
      {
        value: 'https://example.com/picture.jpg',
      },
    ],
    _json: {
      locale: 'en',
    },
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  beforeEach(async () => {
    const mockGoogleOAuthService = {
      findOrCreateUser: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => mockConfig[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthStrategy,
        {
          provide: GoogleOAuthService,
          useValue: mockGoogleOAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<GoogleOAuthStrategy>(GoogleOAuthStrategy);
    googleOAuthService = module.get(GoogleOAuthService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should successfully validate and return user with OAuth info', async () => {
      googleOAuthService.findOrCreateUser.mockResolvedValue(mockUser as any);

      const mockDone = jest.fn();
      const accessToken = 'mock-access-token';
      const refreshToken = 'mock-refresh-token';

      await strategy.validate(
        accessToken,
        refreshToken,
        mockPassportProfile,
        mockDone,
      );

      expect(googleOAuthService.findOrCreateUser).toHaveBeenCalledWith({
        id: 'google-user-id-123',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/picture.jpg',
        locale: 'en',
      });

      expect(mockDone).toHaveBeenCalledWith(null, {
        user: mockUser,
        accessToken,
        refreshToken,
        provider: 'google',
      });
    });

    it('should handle profile with missing optional fields', async () => {
      const incompleteProfile = {
        id: 'google-user-id-123',
        displayName: 'Test User',
        name: {},
        emails: [],
        photos: [],
        _json: {},
      };

      googleOAuthService.findOrCreateUser.mockResolvedValue(mockUser as any);

      const mockDone = jest.fn();
      const accessToken = 'mock-access-token';
      const refreshToken = 'mock-refresh-token';

      await strategy.validate(
        accessToken,
        refreshToken,
        incompleteProfile,
        mockDone,
      );

      expect(googleOAuthService.findOrCreateUser).toHaveBeenCalledWith({
        id: 'google-user-id-123',
        email: '',
        verified_email: false,
        name: 'Test User',
        given_name: '',
        family_name: '',
        picture: '',
        locale: 'en',
      });

      expect(mockDone).toHaveBeenCalledWith(null, {
        user: mockUser,
        accessToken,
        refreshToken,
        provider: 'google',
      });
    });

    it('should handle errors from GoogleOAuthService', async () => {
      const error = new Error('User creation failed');
      googleOAuthService.findOrCreateUser.mockRejectedValue(error);

      const mockDone = jest.fn();
      const accessToken = 'mock-access-token';
      const refreshToken = 'mock-refresh-token';

      await strategy.validate(
        accessToken,
        refreshToken,
        mockPassportProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(error, null);
    });

    it('should handle profile with unverified email', async () => {
      const profileWithUnverifiedEmail = {
        ...mockPassportProfile,
        emails: [
          {
            value: 'test@example.com',
            verified: false,
          },
        ],
      };

      googleOAuthService.findOrCreateUser.mockResolvedValue(mockUser as any);

      const mockDone = jest.fn();
      const accessToken = 'mock-access-token';
      const refreshToken = 'mock-refresh-token';

      await strategy.validate(
        accessToken,
        refreshToken,
        profileWithUnverifiedEmail,
        mockDone,
      );

      expect(googleOAuthService.findOrCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          verified_email: false,
        }),
      );
    });
  });
});
