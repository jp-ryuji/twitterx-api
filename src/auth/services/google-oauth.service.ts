import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthProvider } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate Google OAuth authorization URL
   */
  generateAuthUrl(state?: string): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientId || !redirectUri) {
      throw new Error('Google OAuth configuration is missing');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth configuration is missing');
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(
          `Token exchange failed: ${response.status} - ${errorData}`,
        );
        throw new Error(
          `Failed to exchange code for tokens: ${response.status}`,
        );
      }

      const tokens = (await response.json()) as GoogleOAuthTokens;
      return tokens;
    } catch (error) {
      this.logger.error('Error exchanging code for tokens:', error);
      // Re-throw the specific error if it's already our custom error
      if (
        error instanceof Error &&
        error.message.includes('Failed to exchange code for tokens:')
      ) {
        throw error;
      }
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get user profile from Google using access token
   */
  async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const profileUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

    try {
      const response = await fetch(profileUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(
          `Profile fetch failed: ${response.status} - ${errorData}`,
        );
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const profile = (await response.json()) as GoogleUserProfile;
      return profile;
    } catch (error) {
      this.logger.error('Error fetching user profile:', error);
      // Re-throw the specific error if it's already our custom error
      if (
        error instanceof Error &&
        error.message.includes('Failed to fetch user profile:')
      ) {
        throw error;
      }
      throw new Error('Failed to fetch user profile from Google');
    }
  }

  /**
   * Find or create user from Google OAuth profile
   */
  async findOrCreateUser(profile: GoogleUserProfile) {
    // First, check if user already exists with this Google provider
    const existingOAuthProvider =
      await this.prisma.userOAuthProvider.findUnique({
        where: {
          provider_providerId: {
            provider: AuthProvider.GOOGLE,
            providerId: profile.id,
          },
        },
        include: {
          user: true,
        },
      });

    if (existingOAuthProvider) {
      // Update the email in the OAuth provider record if it changed
      if (existingOAuthProvider.email !== profile.email) {
        await this.prisma.userOAuthProvider.update({
          where: { id: existingOAuthProvider.id },
          data: { email: profile.email },
        });
      }
      return existingOAuthProvider.user;
    }

    // Check if user exists with the same email
    const existingUser = await this.prisma.user.findUnique({
      where: { emailLower: profile.email.toLowerCase() },
    });

    if (existingUser) {
      // Link Google OAuth to existing user
      await this.prisma.userOAuthProvider.create({
        data: {
          userId: existingUser.id,
          provider: AuthProvider.GOOGLE,
          providerId: profile.id,
          email: profile.email,
        },
      });
      return existingUser;
    }

    // Create new user with Google OAuth
    const username = await this.generateUniqueUsername(
      profile.given_name || profile.name,
    );

    const newUser = await this.prisma.user.create({
      data: {
        username,
        usernameLower: username.toLowerCase(),
        email: profile.email,
        emailLower: profile.email.toLowerCase(),
        displayName: profile.name,
        emailVerified: profile.verified_email,
        oauthProviders: {
          create: {
            provider: AuthProvider.GOOGLE,
            providerId: profile.id,
            email: profile.email,
          },
        },
      },
    });

    return newUser;
  }

  /**
   * Generate a unique username based on the provided name
   */
  private async generateUniqueUsername(baseName: string): Promise<string> {
    // Clean the base name to create a valid username
    let cleanName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 12); // Leave room for numbers

    if (!cleanName) {
      cleanName = 'user';
    }

    // Check if the base name is available
    const existingUser = await this.prisma.user.findUnique({
      where: { usernameLower: cleanName },
    });

    if (!existingUser) {
      return cleanName;
    }

    // Generate variations with numbers
    for (let i = 1; i <= 999; i++) {
      const candidate = `${cleanName}${i}`;
      if (candidate.length > 15) {
        // If too long, truncate the base name
        const truncated = cleanName.substring(0, 15 - i.toString().length);
        const newCandidate = `${truncated}${i}`;

        const exists = await this.prisma.user.findUnique({
          where: { usernameLower: newCandidate },
        });

        if (!exists) {
          return newCandidate;
        }
      } else {
        const exists = await this.prisma.user.findUnique({
          where: { usernameLower: candidate },
        });

        if (!exists) {
          return candidate;
        }
      }
    }

    // Fallback: generate random username
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `user${randomSuffix}`;
  }

  /**
   * Validate Google access token
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const tokenInfoUrl = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`;
      const response = await fetch(tokenInfoUrl);

      if (!response.ok) {
        return false;
      }

      const tokenInfo = (await response.json()) as { audience?: string };

      // Check if token is for our application
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      return tokenInfo.audience === clientId;
    } catch (error) {
      this.logger.error('Error validating access token:', error);
      return false;
    }
  }
}
