import { Test, TestingModule } from '@nestjs/testing';

import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

import { ValidationService } from './validation.service';

// Test DTO for validation
class TestDto {
  username: string;
  email: string;
}

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateDto', () => {
    it('should validate a valid DTO', async () => {
      const data = { username: 'john_doe', email: 'test@example.com' };
      const errors = await service.validateDto(TestDto, data);

      expect(errors).toBeInstanceOf(Array);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string input', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = service.sanitizeInput(input);

      expect(result).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;Hello World',
      );
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize email to lowercase', () => {
      const input = 'TEST@EXAMPLE.COM';
      const result = service.sanitizeEmail(input);

      expect(result).toBe('test@example.com');
    });
  });

  describe('sanitizeUsername', () => {
    it('should remove invalid characters from username', () => {
      const input = 'user@name#123!';
      const result = service.sanitizeUsername(input);

      expect(result).toBe('username123');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTPS URL', () => {
      const input = 'https://example.com';
      const result = service.sanitizeUrl(input);

      expect(result).toBe('https://example.com');
    });

    it('should reject invalid URL', () => {
      const input = 'not-a-url';
      const result = service.sanitizeUrl(input);

      expect(result).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should remove control characters', () => {
      const input = 'test\x00\x01\x02string';
      const result = service.sanitizeText(input);

      expect(result).toBe('teststring');
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace invalid characters with underscores', () => {
      const input = 'file<name>.txt';
      const result = service.sanitizeFilename(input);

      expect(result).toBe('file_name_.txt');
    });
  });

  describe('containsSqlInjection', () => {
    it('should detect SQL injection patterns', () => {
      const input = "'; DROP TABLE users; --";
      const result = service.containsSqlInjection(input);

      expect(result).toBe(true);
    });

    it('should not detect safe input as SQL injection', () => {
      const input = 'normal user input';
      const result = service.containsSqlInjection(input);

      expect(result).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors', async () => {
      class TestDto {
        username: string;
      }

      const dto = plainToClass(TestDto, { username: '' });
      const errors: ValidationError[] = await validate(dto);

      const formatted = service.formatValidationErrors(errors);

      expect(formatted).toBeInstanceOf(Object);
    });
  });

  describe('validateFileUpload', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024000,
      destination: './uploads',
      filename: 'test123.jpg',
      path: './uploads/test123.jpg',
      buffer: Buffer.from('test'),
    };

    it('should validate file within size limits', () => {
      const result = service.validateFileUpload(
        mockFile,
        2000000, // 2MB
        ['image/jpeg', 'image/png'],
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file that is too large', () => {
      const result = service.validateFileUpload(
        mockFile,
        500000, // 500KB
        ['image/jpeg', 'image/png'],
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should reject file with disallowed MIME type', () => {
      const result = service.validateFileUpload(
        mockFile,
        2000000, // 2MB
        ['image/png', 'image/gif'],
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle null file', () => {
      const result = service.validateFileUpload(
        null,
        2000000, // 2MB
        ['image/jpeg', 'image/png'],
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});
