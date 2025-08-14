import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { Strategy, VerifyCallback } from 'passport-google-oauth20';

import {
  GoogleOAuthService,
  GoogleUserProfile,
} from '../services/google-oauth.service';

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['openid', 'email', 'profile'],
    });
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
      done(error, null);
    }
  }
}
