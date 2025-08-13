import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { SignUpDto } from './sign-up.dto';

describe('SignUpDto', () => {
  describe('username validation', () => {
    it('should accept valid username', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors).toHaveLength(0);
    });

    it('should reject username shorter than 3 characters', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'jo',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors).toHaveLength(1);
      expect(usernameErrors[0].constraints?.isLength).toContain(
        'Username must be between 3 and 15 characters',
      );
    });

    it('should reject username longer than 15 characters', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'this_username_is_too_long',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors).toHaveLength(1);
      expect(usernameErrors[0].constraints?.isLength).toContain(
        'Username must be between 3 and 15 characters',
      );
    });

    it('should reject username with invalid characters', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john-doe!',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors).toHaveLength(1);
      expect(usernameErrors[0].constraints?.matches).toContain(
        'Username can only contain letters, numbers, and underscores',
      );
    });

    it('should trim whitespace from username', () => {
      const dto = plainToClass(SignUpDto, {
        username: '  john_doe123  ',
        password: 'SecurePassword123!',
      });

      expect(dto.username).toBe('john_doe123');
    });
  });

  describe('email validation', () => {
    it('should accept valid email', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors).toHaveLength(0);
    });

    it('should reject invalid email format', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        email: 'invalid-email',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors).toHaveLength(1);
      expect(emailErrors[0].constraints?.isEmail).toContain(
        'Please provide a valid email address',
      );
    });

    it('should allow email to be optional', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors).toHaveLength(0);
    });

    it('should transform email to lowercase and trim whitespace', () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        email: '  John.Doe@EXAMPLE.COM  ',
        password: 'SecurePassword123!',
      });

      expect(dto.email).toBe('john.doe@example.com');
    });
  });

  describe('password validation', () => {
    it('should accept valid password', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'short',
      });

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.minLength).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should require password to be present', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
      });

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('displayName validation', () => {
    it('should accept valid display name', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
        displayName: 'John Doe',
      });

      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors).toHaveLength(0);
    });

    it('should reject display name longer than 50 characters', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
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
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors).toHaveLength(0);
    });

    it('should trim whitespace from display name', () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
        displayName: '  John Doe  ',
      });

      expect(dto.displayName).toBe('John Doe');
    });
  });

  describe('birthDate validation', () => {
    it('should accept valid birth date', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
        birthDate: '1990-01-15',
      });

      const errors = await validate(dto);
      const birthDateErrors = errors.filter(
        (error) => error.property === 'birthDate',
      );

      expect(birthDateErrors).toHaveLength(0);
    });

    it('should reject invalid birth date format', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
        birthDate: '15/01/1990',
      });

      const errors = await validate(dto);
      const birthDateErrors = errors.filter(
        (error) => error.property === 'birthDate',
      );

      expect(birthDateErrors).toHaveLength(1);
      expect(birthDateErrors[0].constraints?.isDateString).toContain(
        'Birth date must be in YYYY-MM-DD format',
      );
    });

    it('should allow birth date to be optional', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const birthDateErrors = errors.filter(
        (error) => error.property === 'birthDate',
      );

      expect(birthDateErrors).toHaveLength(0);
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        displayName: 'John Doe',
        birthDate: '1990-01-15',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with only required fields', async () => {
      const dto = plainToClass(SignUpDto, {
        username: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
