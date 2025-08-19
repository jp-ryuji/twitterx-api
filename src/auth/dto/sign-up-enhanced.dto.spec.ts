import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { SignUpDto } from './sign-up-enhanced.dto';

describe('SignUpDto', () => {
  function createDto(data: Record<string, unknown>): SignUpDto {
    return plainToClass(SignUpDto, data);
  }

  describe('username', () => {
    it('should accept valid username', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
      });
      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBe(0);
    });

    it('should reject username with invalid characters', async () => {
      const dto = createDto({
        username: '@@@', // After sanitization, this would be empty string which is invalid
        password: 'SecurePassword123!',
      });
      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBeGreaterThan(0);
    });

    it('should reject username that is too short', async () => {
      const dto = createDto({
        username: 'jo',
        password: 'SecurePassword123!',
      });
      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBeGreaterThan(0);
      expect(usernameErrors[0].property).toBe('username');
    });

    it('should reject username that is too long', async () => {
      const dto = createDto({
        username: 'j'.repeat(16),
        password: 'SecurePassword123!',
      });
      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBeGreaterThan(0);
      expect(usernameErrors[0].property).toBe('username');
    });

    it('should sanitize username input', async () => {
      const dto = createDto({
        username: '  john_doe123  ',
        password: 'SecurePassword123!',
      });
      const errors = await validate(dto);
      const usernameErrors = errors.filter(
        (error) => error.property === 'username',
      );

      expect(usernameErrors.length).toBe(0);
      expect(dto.username).toBe('john_doe123');
    });
  });

  describe('email', () => {
    it('should accept valid email', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
        email: 'test@example.com',
      });
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors.length).toBe(0);
    });

    it('should reject invalid email', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
        email: 'invalid-email',
      });
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors.length).toBeGreaterThan(0);
      expect(emailErrors[0].property).toBe('email');
    });

    it('should sanitize email input', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
        email: '  TEST@EXAMPLE.COM  ',
      });
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');

      expect(emailErrors.length).toBe(0);
      expect(dto.email).toBe('test@example.com');
    });
  });

  describe('password', () => {
    it('should accept valid password', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
      });
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors.length).toBe(0);
    });

    it('should reject password that is too short', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'short',
      });
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(passwordErrors.length).toBeGreaterThan(0);
      expect(passwordErrors[0].property).toBe('password');
    });
  });

  describe('displayName', () => {
    it('should accept valid display name', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
        displayName: 'John Doe',
      });
      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBe(0);
    });

    it('should reject display name that is too long', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
        displayName: 'A'.repeat(51),
      });
      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBeGreaterThan(0);
      expect(displayNameErrors[0].property).toBe('displayName');
    });

    it('should sanitize display name input', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
        displayName: '  John Doe  ',
      });
      const errors = await validate(dto);
      const displayNameErrors = errors.filter(
        (error) => error.property === 'displayName',
      );

      expect(displayNameErrors.length).toBe(0);
      expect(dto.displayName).toBe('John Doe');
    });
  });

  describe('birthDate', () => {
    it('should accept valid birth date', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
        birthDate: '1990-01-15',
      });
      const errors = await validate(dto);
      const birthDateErrors = errors.filter(
        (error) => error.property === 'birthDate',
      );

      expect(birthDateErrors.length).toBe(0);
    });

    it('should reject invalid birth date format', async () => {
      const dto = createDto({
        username: 'john_doe123',
        password: 'SecurePassword123!',
        birthDate: 'invalid-date',
      });
      const errors = await validate(dto);
      const birthDateErrors = errors.filter(
        (error) => error.property === 'birthDate',
      );

      expect(birthDateErrors.length).toBeGreaterThan(0);
      expect(birthDateErrors[0].property).toBe('birthDate');
    });
  });
});
