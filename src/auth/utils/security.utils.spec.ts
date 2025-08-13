import { SecurityUtils } from './security.utils';

describe('SecurityUtils', () => {
  describe('sanitizeString', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const result = SecurityUtils.sanitizeString(input);

      expect(result).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
      );
    });

    it('should trim whitespace', () => {
      const input = '  test string  ';
      const result = SecurityUtils.sanitizeString(input);

      expect(result).toBe('test string');
    });

    it('should handle empty string', () => {
      const result = SecurityUtils.sanitizeString('');

      expect(result).toBe('');
    });

    it('should handle null/undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(SecurityUtils.sanitizeString(null as any)).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(SecurityUtils.sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize email to lowercase', () => {
      const input = 'TEST@EXAMPLE.COM';
      const result = SecurityUtils.sanitizeEmail(input);

      expect(result).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const input = '  test@example.com  ';
      const result = SecurityUtils.sanitizeEmail(input);

      expect(result).toBe('test@example.com');
    });

    it('should handle empty string', () => {
      const result = SecurityUtils.sanitizeEmail('');

      expect(result).toBe('');
    });

    it('should preserve valid email format', () => {
      const input = 'user.name+tag@example.com';
      const result = SecurityUtils.sanitizeEmail(input);

      expect(result).toBe('user.name+tag@example.com');
    });
  });

  describe('sanitizeUsername', () => {
    it('should remove invalid characters', () => {
      const input = 'user@name#123!';
      const result = SecurityUtils.sanitizeUsername(input);

      expect(result).toBe('username123');
    });

    it('should preserve valid characters', () => {
      const input = 'valid_username123';
      const result = SecurityUtils.sanitizeUsername(input);

      expect(result).toBe('valid_username123');
    });

    it('should trim whitespace', () => {
      const input = '  username  ';
      const result = SecurityUtils.sanitizeUsername(input);

      expect(result).toBe('username');
    });

    it('should handle empty string', () => {
      const result = SecurityUtils.sanitizeUsername('');

      expect(result).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTPS URL', () => {
      const input = 'https://example.com';
      const result = SecurityUtils.sanitizeUrl(input);

      expect(result).toBe('https://example.com');
    });

    it('should accept valid HTTP URL', () => {
      const input = 'http://example.com';
      const result = SecurityUtils.sanitizeUrl(input);

      expect(result).toBe('http://example.com');
    });

    it('should reject URL without protocol', () => {
      const input = 'example.com';
      const result = SecurityUtils.sanitizeUrl(input);

      expect(result).toBe('');
    });

    it('should reject invalid URL', () => {
      const input = 'not-a-url';
      const result = SecurityUtils.sanitizeUrl(input);

      expect(result).toBe('');
    });

    it('should reject javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = SecurityUtils.sanitizeUrl(input);

      expect(result).toBe('');
    });

    it('should handle empty string', () => {
      const result = SecurityUtils.sanitizeUrl('');

      expect(result).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should remove control characters', () => {
      const input = 'test\x00\x01\x02string';
      const result = SecurityUtils.sanitizeText(input);

      expect(result).toBe('teststring');
    });

    it('should preserve newlines and tabs', () => {
      const input = 'line1\nline2\tindented';
      const result = SecurityUtils.sanitizeText(input);

      expect(result).toBe('line1\nline2\tindented');
    });

    it('should trim whitespace', () => {
      const input = '  test text  ';
      const result = SecurityUtils.sanitizeText(input);

      expect(result).toBe('test text');
    });

    it('should handle empty string', () => {
      const result = SecurityUtils.sanitizeText('');

      expect(result).toBe('');
    });
  });

  describe('isValidIpAddress', () => {
    it('should validate IPv4 address', () => {
      const result = SecurityUtils.isValidIpAddress('192.168.1.1');

      expect(result).toBe(true);
    });

    it('should validate IPv6 address', () => {
      const result = SecurityUtils.isValidIpAddress(
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      );

      expect(result).toBe(true);
    });

    it('should reject invalid IP address', () => {
      const result = SecurityUtils.isValidIpAddress('256.256.256.256');

      expect(result).toBe(false);
    });

    it('should reject non-IP string', () => {
      const result = SecurityUtils.isValidIpAddress('not-an-ip');

      expect(result).toBe(false);
    });
  });

  describe('isValidDisplayName', () => {
    it('should accept valid display name', () => {
      const result = SecurityUtils.isValidDisplayName('John Doe');

      expect(result).toBe(true);
    });

    it('should accept display name with punctuation', () => {
      const result = SecurityUtils.isValidDisplayName("John O'Connor-Smith");

      expect(result).toBe(true);
    });

    it('should reject display name that is too long', () => {
      const longName = 'A'.repeat(51);
      const result = SecurityUtils.isValidDisplayName(longName);

      expect(result).toBe(false);
    });

    it('should reject display name with invalid characters', () => {
      const result = SecurityUtils.isValidDisplayName('John<script>');

      expect(result).toBe(false);
    });

    it('should accept empty display name', () => {
      const result = SecurityUtils.isValidDisplayName('');

      expect(result).toBe(true);
    });
  });

  describe('isValidBio', () => {
    it('should accept valid bio', () => {
      const result = SecurityUtils.isValidBio('This is a valid bio.');

      expect(result).toBe(true);
    });

    it('should reject bio that is too long', () => {
      const longBio = 'A'.repeat(161);
      const result = SecurityUtils.isValidBio(longBio);

      expect(result).toBe(false);
    });

    it('should accept empty bio', () => {
      const result = SecurityUtils.isValidBio('');

      expect(result).toBe(true);
    });

    it('should accept bio with special characters', () => {
      const result = SecurityUtils.isValidBio(
        'Bio with émojis 🚀 and symbols!',
      );

      expect(result).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace invalid characters with underscores', () => {
      const input = 'file<name>.txt';
      const result = SecurityUtils.sanitizeFilename(input);

      expect(result).toBe('file_name_.txt');
    });

    it('should remove leading dots', () => {
      const input = '...filename.txt';
      const result = SecurityUtils.sanitizeFilename(input);

      expect(result).toBe('filename.txt');
    });

    it('should truncate long filenames', () => {
      const longFilename = 'A'.repeat(300) + '.txt';
      const result = SecurityUtils.sanitizeFilename(longFilename);

      expect(result.length).toBe(255);
    });

    it('should preserve valid filename characters', () => {
      const input = 'valid_file-name.123.txt';
      const result = SecurityUtils.sanitizeFilename(input);

      expect(result).toBe('valid_file-name.123.txt');
    });

    it('should handle empty string', () => {
      const result = SecurityUtils.sanitizeFilename('');

      expect(result).toBe('');
    });
  });

  describe('containsSqlInjection', () => {
    it('should detect SQL keywords', () => {
      const input = "'; DROP TABLE users; --";
      const result = SecurityUtils.containsSqlInjection(input);

      expect(result).toBe(true);
    });

    it('should detect UNION attacks', () => {
      const input = '1 UNION SELECT * FROM users';
      const result = SecurityUtils.containsSqlInjection(input);

      expect(result).toBe(true);
    });

    it('should detect comment patterns', () => {
      const input = 'test -- comment';
      const result = SecurityUtils.containsSqlInjection(input);

      expect(result).toBe(true);
    });

    it('should detect OR/AND patterns', () => {
      const input = '1 OR 1=1';
      const result = SecurityUtils.containsSqlInjection(input);

      expect(result).toBe(true);
    });

    it('should accept safe input', () => {
      const input = 'normal user input';
      const result = SecurityUtils.containsSqlInjection(input);

      expect(result).toBe(false);
    });

    it('should handle empty string', () => {
      const result = SecurityUtils.containsSqlInjection('');

      expect(result).toBe(false);
    });
  });

  describe('generateRateLimitKey', () => {
    it('should generate rate limit key with prefix and identifier', () => {
      const result = SecurityUtils.generateRateLimitKey('login', '192.168.1.1');

      expect(result).toBe('login:192.168.1.1');
    });

    it('should handle different prefixes', () => {
      const result = SecurityUtils.generateRateLimitKey('signup', 'user123');

      expect(result).toBe('signup:user123');
    });
  });
});
