import { Transform } from 'class-transformer';
import { plainToClass } from 'class-transformer';
import { Validate } from 'class-validator';
import { validate } from 'class-validator';

import { SecurityUtils } from '../../auth/utils/security.utils';

import {
  IsSafeDisplayName,
  IsSafeBio,
  IsSafeText,
  IsSafeUsername,
  IsSafeLocation,
} from './custom.validators';

class TestDto {
  @Validate(IsSafeDisplayName)
  displayName: string;

  @Validate(IsSafeBio)
  bio: string;

  @Validate(IsSafeText)
  text: string;

  @Validate(IsSafeUsername)
  username: string;

  @Validate(IsSafeLocation)
  location: string;
}

describe('CustomValidators', () => {
  describe('IsSafeDisplayName', () => {
    it('should validate a safe display name', async () => {
      const dto = plainToClass(TestDto, {
        displayName: 'John Doe',
      });

      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBe(0);
    });

    it('should reject display name that is too long', async () => {
      const dto = plainToClass(TestDto, {
        displayName: 'A'.repeat(51), // 51 characters, max is 50
      });

      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBeGreaterThan(0);
    });

    it('should reject display name with unsafe characters', async () => {
      const dto = plainToClass(TestDto, {
        displayName: 'John<script>alert("xss")</script>',
      });

      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBeGreaterThan(0);
    });
  });

  describe('IsSafeBio', () => {
    it('should validate a safe bio', async () => {
      const dto = plainToClass(TestDto, {
        bio: 'This is a valid bio for a user profile.',
      });

      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors.length).toBe(0);
    });

    it('should reject bio that is too long', async () => {
      const dto = plainToClass(TestDto, {
        bio: 'A'.repeat(161), // 161 characters, max is 160
      });

      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors.length).toBeGreaterThan(0);
    });

    it('should accept bio with special characters', async () => {
      const dto = plainToClass(TestDto, {
        bio: 'Bio with émojis 🚀 and symbols!',
      });

      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors.length).toBe(0);
    });
  });

  describe('IsSafeText', () => {
    it('should validate safe text', async () => {
      const dto = plainToClass(TestDto, {
        text: 'This is safe text content.',
      });

      const errors = await validate(dto);
      const textErrors = errors.filter((error) => error.property === 'text');

      expect(textErrors.length).toBe(0);
    });

    it('should reject text with SQL injection patterns', async () => {
      const dto = plainToClass(TestDto, {
        text: "'; DROP TABLE users; --",
      });

      const errors = await validate(dto);
      const textErrors = errors.filter((error) => error.property === 'text');

      expect(textErrors.length).toBeGreaterThan(0);
    });

    it('should reject text that is too long', async () => {
      const dto = plainToClass(TestDto, {
        text: 'A'.repeat(1001), // 1001 characters, max is 1000
      });

      const errors = await validate(dto);
      const textErrors = errors.filter((error) => error.property === 'text');

      expect(textErrors.length).toBeGreaterThan(0);
    });
  });

  describe('IsSafeUsername', () => {
    it('should validate a safe username', async () => {
      const dto = plainToClass(TestDto, {
        username: 'john_doe123',
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBe(0);
    });

    it('should reject username with SQL injection patterns', async () => {
      const dto = plainToClass(TestDto, {
        username: "john'; DROP TABLE users; --",
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBeGreaterThan(0);
    });

    it('should reject username that is too short', async () => {
      const dto = plainToClass(TestDto, {
        username: 'jo', // 2 characters, min is 3
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBeGreaterThan(0);
    });

    it('should reject username that is too long', async () => {
      const dto = plainToClass(TestDto, {
        username: 'j'.repeat(16), // 16 characters, max is 15
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBeGreaterThan(0);
    });

    it('should reject username with invalid characters', async () => {
      const dto = plainToClass(TestDto, {
        username: 'john.doe!',
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBeGreaterThan(0);
    });
  });

  describe('IsSafeLocation', () => {
    it('should validate a safe location', async () => {
      const dto = plainToClass(TestDto, {
        location: 'San Francisco, CA',
      });

      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors.length).toBe(0);
    });

    it('should reject location with SQL injection patterns', async () => {
      const dto = plainToClass(TestDto, {
        location: "San Francisco'; DROP TABLE users; --",
      });

      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors.length).toBeGreaterThan(0);
    });

    it('should reject location that is too long', async () => {
      const dto = plainToClass(TestDto, {
        location: 'A'.repeat(31), // 31 characters, max is 30
      });

      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors.length).toBeGreaterThan(0);
    });
  });
});
