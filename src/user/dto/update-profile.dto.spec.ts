import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateProfileDto } from './update-profile.dto';

// Helper function to create DTO with proper typing
function createDto(data: Record<string, unknown>): UpdateProfileDto {
  return plainToClass(UpdateProfileDto, data);
}

describe('UpdateProfileDto', () => {
  describe('displayName validation', () => {
    it('should accept valid display name', async () => {
      const dto = createDto({
        displayName: 'John Doe',
      });

      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors).toHaveLength(0);
    });

    it('should reject display name longer than 50 characters', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        displayName:
          'This is a very long display name that exceeds the maximum allowed length of fifty characters',
      });

      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors).toHaveLength(1);
      expect(displayNameErrors[0].constraints?.maxLength).toContain(
        'Display name cannot exceed 50 characters',
      );
    });

    it('should allow display name to be optional', async () => {
      const dto = plainToClass(UpdateProfileDto, {});

      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors).toHaveLength(0);
    });

    it('should trim whitespace from display name', () => {
      const dto = plainToClass(UpdateProfileDto, {
        displayName: '  John Doe  ',
      });

      expect(dto.displayName).toBe('John Doe');
    });
  });

  describe('bio validation', () => {
    it('should accept valid bio', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        bio: 'Software developer passionate about technology and innovation.',
      });

      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors).toHaveLength(0);
    });

    it('should reject bio longer than 160 characters', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        bio: 'This is a very long bio that exceeds the maximum allowed length of one hundred and sixty characters. It should be rejected by the validation logic because it is too long.',
      });

      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors).toHaveLength(1);
      expect(bioErrors[0].constraints?.maxLength).toContain(
        'Bio cannot exceed 160 characters',
      );
    });

    it('should allow bio to be optional', async () => {
      const dto = plainToClass(UpdateProfileDto, {});

      const errors = await validate(dto);
      const bioErrors = errors.filter((error) => error.property === 'bio');

      expect(bioErrors).toHaveLength(0);
    });

    it('should trim whitespace from bio', () => {
      const dto = plainToClass(UpdateProfileDto, {
        bio: '  Software developer passionate about technology.  ',
      });

      expect(dto.bio).toBe('Software developer passionate about technology.');
    });
  });

  describe('location validation', () => {
    it('should accept valid location', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        location: 'San Francisco, CA',
      });

      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors).toHaveLength(0);
    });

    it('should allow location to be optional', async () => {
      const dto = plainToClass(UpdateProfileDto, {});

      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'location',
      );

      expect(locationErrors).toHaveLength(0);
    });

    it('should trim whitespace from location', () => {
      const dto = plainToClass(UpdateProfileDto, {
        location: '  San Francisco, CA  ',
      });

      expect(dto.location).toBe('San Francisco, CA');
    });
  });

  describe('websiteUrl validation', () => {
    it('should accept valid URL', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        websiteUrl: 'https://johndoe.dev',
      });

      const errors = await validate(dto);
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(websiteUrlErrors).toHaveLength(0);
    });

    it('should accept URL with http protocol', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        websiteUrl: 'http://johndoe.dev',
      });

      const errors = await validate(dto);
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(websiteUrlErrors).toHaveLength(0);
    });

    it('should reject invalid URL format', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        websiteUrl: 'not-a-valid-url',
      });

      const errors = await validate(dto);
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(websiteUrlErrors).toHaveLength(1);
      expect(websiteUrlErrors[0].constraints?.isUrl).toContain(
        'Please provide a valid URL',
      );
    });

    it('should allow websiteUrl to be optional', async () => {
      const dto = plainToClass(UpdateProfileDto, {});

      const errors = await validate(dto);
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(websiteUrlErrors).toHaveLength(0);
    });

    it('should trim whitespace from websiteUrl', () => {
      const dto = plainToClass(UpdateProfileDto, {
        websiteUrl: '  https://johndoe.dev  ',
      });

      expect(dto.websiteUrl).toBe('https://johndoe.dev');
    });
  });

  describe('birthDate exclusion', () => {
    it('should not have birthDate property', () => {
      const dto = new UpdateProfileDto();
      expect(dto).not.toHaveProperty('birthDate');
    });

    it('should not include birthDate in validation even if provided', async () => {
      // This test ensures birthDate is not validated as part of the DTO
      const plainObject = {
        displayName: 'John Doe',
        birthDate: '1990-01-15', // This should be ignored by validation
      };

      const dto = plainToClass(UpdateProfileDto, plainObject);

      // Validation should not include birthDate errors
      const errors = await validate(dto);
      const birthDateErrors = errors.filter(
        (error) => error.property === 'birthDate',
      );
      expect(birthDateErrors).toHaveLength(0);

      // The DTO should have the defined properties
      expect(dto.displayName).toBe('John Doe');
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        displayName: 'John Doe',
        bio: 'Software developer passionate about technology.',
        location: 'San Francisco, CA',
        websiteUrl: 'https://johndoe.dev',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with no fields (all optional)', async () => {
      const dto = plainToClass(UpdateProfileDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with partial fields', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        displayName: 'John Doe',
        bio: 'Software developer',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle multiple validation errors', async () => {
      const dto = plainToClass(UpdateProfileDto, {
        displayName:
          'This is a very long display name that exceeds the maximum allowed length of fifty characters',
        bio: 'This is a very long bio that exceeds the maximum allowed length of one hundred and sixty characters. It should be rejected by the validation logic because it is too long.',
        websiteUrl: 'not-a-valid-url',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(3);

      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );
      const bioErrors = errors.filter((error) => error.property === 'bio');
      const websiteUrlErrors = errors.filter(
        (error) => error.property === 'websiteUrl',
      );

      expect(displayNameErrors).toHaveLength(1);
      expect(bioErrors).toHaveLength(1);
      expect(websiteUrlErrors).toHaveLength(1);
    });
  });
});
