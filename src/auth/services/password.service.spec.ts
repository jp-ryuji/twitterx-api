import { Test, TestingModule } from '@nestjs/testing';

import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await service.hashPassword(password);

      const isValid = await service.validatePassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hashedPassword = await service.hashPassword(password);

      const isValid = await service.validatePassword(
        wrongPassword,
        hashedPassword,
      );

      expect(isValid).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a secure token', () => {
      const token = service.generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate different tokens each time', () => {
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate tokens with only hex characters', () => {
      const token = service.generateSecureToken();
      const hexPattern = /^[a-f0-9]+$/;

      expect(hexPattern.test(token)).toBe(true);
    });
  });

  describe('generateTokenWithExpiry', () => {
    it('should generate token with default 24 hour expiry', () => {
      const result = service.generateTokenWithExpiry();

      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.token.length).toBe(64);
      expect(result.expiresAt).toBeInstanceOf(Date);

      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(
        result.expiresAt.getTime() - expectedExpiry.getTime(),
      );

      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should generate token with custom expiry hours', () => {
      const customHours = 48;
      const result = service.generateTokenWithExpiry(customHours);

      const now = new Date();
      const expectedExpiry = new Date(
        now.getTime() + customHours * 60 * 60 * 1000,
      );
      const timeDiff = Math.abs(
        result.expiresAt.getTime() - expectedExpiry.getTime(),
      );

      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!';
      const result = service.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!';
      const result = service.validatePasswordStrength(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = service.validatePasswordStrength(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must not exceed 128 characters',
      );
    });

    it('should reject password without lowercase letter', () => {
      const password = 'PASSWORD123!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter',
      );
    });

    it('should reject password without uppercase letter', () => {
      const password = 'password123!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should reject password without number', () => {
      const password = 'Password!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
    });

    it('should reject password without special character', () => {
      const password = 'Password123';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character',
      );
    });

    it('should return multiple errors for weak password', () => {
      const weakPassword = 'weak';
      const result = service.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
      expect(result.errors).toContain(
        'Password must contain at least one special character',
      );
    });
  });
});
