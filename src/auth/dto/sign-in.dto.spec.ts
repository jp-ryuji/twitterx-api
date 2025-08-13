import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { SignInDto } from './sign-in.dto';

describe('SignInDto', () => {
  describe('emailOrUsername validation', () => {
    it('should accept valid username', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const emailOrUsernameErrors = errors.filter(
        (error) => error.property === 'emailOrUsername',
      );

      expect(emailOrUsernameErrors).toHaveLength(0);
    });

    it('should accept valid email', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john.doe@example.com',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const emailOrUsernameErrors = errors.filter(
        (error) => error.property === 'emailOrUsername',
      );

      expect(emailOrUsernameErrors).toHaveLength(0);
    });

    it('should require emailOrUsername to be present', async () => {
      const dto = plainToClass(SignInDto, {
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const emailOrUsernameErrors = errors.filter(
        (error) => error.property === 'emailOrUsername',
      );

      expect(emailOrUsernameErrors).toHaveLength(1);
      expect(emailOrUsernameErrors[0].constraints?.isString).toBeDefined();
    });

    it('should trim whitespace from emailOrUsername', () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: '  john_doe123  ',
        password: 'SecurePassword123!',
      });

      expect(dto.emailOrUsername).toBe('john_doe123');
    });

    it('should handle mixed case input (case-insensitive handling)', () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'John_Doe123',
        password: 'SecurePassword123!',
      });

      // The DTO should preserve the original casing for processing
      // Case-insensitive handling will be done at the service level
      expect(dto.emailOrUsername).toBe('John_Doe123');
    });
  });

  describe('password validation', () => {
    it('should accept valid password', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(0);
    });

    it('should require password to be present', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
      });

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.isString).toBeDefined();
    });

    it('should accept any password length (validation is only for signup)', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'short',
      });

      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors).toHaveLength(0);
    });
  });

  describe('rememberMe validation', () => {
    it('should accept true value', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'SecurePassword123!',
        rememberMe: true,
      });

      const errors = await validate(dto);
      const rememberMeErrors = errors.filter(
        (error) => error.property === 'rememberMe',
      );

      expect(rememberMeErrors).toHaveLength(0);
      expect(dto.rememberMe).toBe(true);
    });

    it('should accept false value', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'SecurePassword123!',
        rememberMe: false,
      });

      const errors = await validate(dto);
      const rememberMeErrors = errors.filter(
        (error) => error.property === 'rememberMe',
      );

      expect(rememberMeErrors).toHaveLength(0);
      expect(dto.rememberMe).toBe(false);
    });

    it('should default to false when not provided', () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'SecurePassword123!',
      });

      expect(dto.rememberMe).toBe(false);
    });

    it('should allow rememberMe to be optional', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      const rememberMeErrors = errors.filter(
        (error) => error.property === 'rememberMe',
      );

      expect(rememberMeErrors).toHaveLength(0);
    });

    it('should reject non-boolean values', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'SecurePassword123!',
        rememberMe: 'true' as unknown as boolean,
      });

      const errors = await validate(dto);
      const rememberMeErrors = errors.filter(
        (error) => error.property === 'rememberMe',
      );

      expect(rememberMeErrors).toHaveLength(1);
      expect(rememberMeErrors[0].constraints?.isBoolean).toBeDefined();
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john_doe123',
        password: 'SecurePassword123!',
        rememberMe: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with only required fields', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john.doe@example.com',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle email as emailOrUsername', async () => {
      const dto = plainToClass(SignInDto, {
        emailOrUsername: 'john.doe@example.com',
        password: 'SecurePassword123!',
        rememberMe: false,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.emailOrUsername).toBe('john.doe@example.com');
    });
  });
});
