import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateProfileDto } from './update-profile-enhanced.dto';

describe('UpdateProfileDto', () => {
  function createDto(data: Record<string, unknown>): UpdateProfileDto {
    return plainToClass(UpdateProfileDto, data);
  }

  describe('displayName', () => {
    it('should accept valid display name', async () => {
      const dto = createDto({ displayName: 'John Doe' });
      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBe(0);
    });

    it('should accept empty display name', async () => {
      const dto = createDto({ displayName: '' });
      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBe(0);
    });

    it('should reject display name that is too long', async () => {
      const dto = createDto({ displayName: 'A'.repeat(51) });
      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBeGreaterThan(0);
      expect(displayNameErrors[0].property).toBe('displayName');
    });

    it('should sanitize display name input', async () => {
      const dto = createDto({ displayName: '  John Doe  ' });
      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBe(0);
      expect(dto.displayName).toBe('John Doe');
    });
  });

  describe('bio', () => {
    it('should accept valid bio', async () => {
      const dto = createDto({ bio: 'This is a valid bio.' });
      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors.length).toBe(0);
    });

    it('should accept empty bio', async () => {
      const dto = createDto({ bio: '' });
      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors.length).toBe(0);
    });

    it('should reject bio that is too long', async () => {
      const dto = createDto({ bio: 'A'.repeat(161) });
      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors.length).toBeGreaterThan(0);
      expect(bioErrors[0].property).toBe('bio');
    });

    it('should sanitize bio input', async () => {
      const dto = createDto({ bio: '  This is a valid bio.  ' });
      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors.length).toBe(0);
      expect(dto.bio).toBe('This is a valid bio.');
    });
  });

  describe('location', () => {
    it('should accept valid location', async () => {
      const dto = createDto({ location: 'San Francisco, CA' });
      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors.length).toBe(0);
    });

    it('should accept empty location', async () => {
      const dto = createDto({ location: '' });
      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors.length).toBe(0);
    });

    it('should reject location that is too long', async () => {
      const dto = createDto({ location: 'A'.repeat(31) });
      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors.length).toBeGreaterThan(0);
      expect(locationErrors[0].property).toBe('location');
    });

    it('should sanitize location input', async () => {
      const dto = createDto({ location: '  San Francisco, CA  ' });
      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors.length).toBe(0);
      expect(dto.location).toBe('San Francisco, CA');
    });
  });

  describe('websiteUrl', () => {
    it('should accept valid HTTPS URL', async () => {
      const dto = createDto({ websiteUrl: 'https://example.com' });
      const errors = await validate(dto);
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(websiteUrlErrors.length).toBe(0);
    });

    it('should accept valid HTTP URL', async () => {
      const dto = createDto({ websiteUrl: 'http://example.com' });
      const errors = await validate(dto);
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(websiteUrlErrors.length).toBe(0);
    });

    it('should reject URL without protocol', async () => {
      const dto = createDto({ websiteUrl: 'example.com' });
      const errors = await validate(dto);
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(websiteUrlErrors.length).toBeGreaterThan(0);
    });

    it('should sanitize URL input', async () => {
      const dto = createDto({ websiteUrl: '  https://example.com  ' });
      const errors = await validate(dto);
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(websiteUrlErrors.length).toBe(0);
      expect(dto.websiteUrl).toBe('https://example.com');
    });
  });
});
