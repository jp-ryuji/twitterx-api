import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import {
  Strategy,
  VerifyCallback,
  StrategyOptions,
} from 'passport-google-oauth20';

import {
  GoogleOAuthService,
  GoogleUserProfile,
} from '../services/google-oauth.service';

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleOAuthStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {
    // Check if required environment variables are set
    const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    // Initialize the strategy with provided values or fallbacks
    super({
      clientID: clientId || 'mock-client-id',
      clientSecret: clientSecret || 'mock-client-secret',
      callbackURL: callbackURL || 'http://localhost:3000/mock-callback',
      scope: ['openid', 'email', 'profile'],
    } as StrategyOptions);

    // Log a warning if environment variables are not set
    if (!clientId || !clientSecret || !callbackURL) {
      this.logger.warn(
        'Google OAuth environment variables not set. Google OAuth will be disabled.',
      );
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      displayName?: string;
      name?: { givenName?: string; familyName?: string };
      emails?: Array<{ value: string; verified?: boolean }>;
      photos?: Array<{ value: string }>;
      _json?: { locale?: string };
    },
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Transform passport profile to our GoogleUserProfile format
      const googleProfile: GoogleUserProfile = {
        id: profile.id,
        email: profile.emails?.[0]?.value || '',
        verified_email: profile.emails?.[0]?.verified || false,
        name: profile.displayName || '',
        given_name: profile.name?.givenName || '',
        family_name: profile.name?.familyName || '',
        picture: profile.photos?.[0]?.value || '',
        locale: profile._json?.locale || 'en',
      };

      // Find or create user
      const user =
        await this.googleOAuthService.findOrCreateUser(googleProfile);

      // Return user with additional OAuth info
      const result = {
        user,
        accessToken,
        refreshToken,
        provider: 'google',
      };

      done(null, result);
    } catch (error) {
      done(error, false);
    }
  }
}
