import {
  normalizeUsername,
  normalizeEmail,
  isEmailFormat,
  parseLoginCredential,
  validateUsernameFormat,
  generateUsernameSuggestions,
} from './validation.utils';

describe('ValidationUtils', () => {
  describe('normalizeUsername', () => {
    it('should convert username to lowercase', () => {
      expect(normalizeUsername('JohnDoe123')).toBe('johndoe123');
    });

    it('should trim whitespace', () => {
      expect(normalizeUsername('  john_doe  ')).toBe('john_doe');
    });

    it('should handle mixed case and whitespace', () => {
      expect(normalizeUsername('  John_DOE_123  ')).toBe('john_doe_123');
    });
  });

  describe('normalizeEmail', () => {
    it('should convert email to lowercase', () => {
      expect(normalizeEmail('John.Doe@EXAMPLE.COM')).toBe(
        'john.doe@example.com',
      );
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  john.doe@example.com  ')).toBe(
        'john.doe@example.com',
      );
    });

    it('should handle mixed case and whitespace', () => {
      expect(normalizeEmail('  John.DOE@Example.COM  ')).toBe(
        'john.doe@example.com',
      );
    });
  });

  describe('isEmailFormat', () => {
    it('should return true for valid email formats', () => {
      expect(isEmailFormat('john.doe@example.com')).toBe(true);
      expect(isEmailFormat('user+tag@domain.co.uk')).toBe(true);
      expect(isEmailFormat('test123@test-domain.org')).toBe(true);
    });

    it('should return false for invalid email formats', () => {
      expect(isEmailFormat('john_doe123')).toBe(false);
      expect(isEmailFormat('invalid-email')).toBe(false);
      expect(isEmailFormat('@example.com')).toBe(false);
      expect(isEmailFormat('user@')).toBe(false);
      expect(isEmailFormat('user@domain')).toBe(false);
    });

    it('should return false for empty or whitespace strings', () => {
      expect(isEmailFormat('')).toBe(false);
      expect(isEmailFormat('   ')).toBe(false);
    });
  });

  describe('parseLoginCredential', () => {
    it('should identify email credentials', () => {
      const result = parseLoginCredential('john.doe@example.com');
      expect(result.type).toBe('email');
      expect(result.normalized).toBe('john.doe@example.com');
      expect(result.original).toBe('john.doe@example.com');
    });

    it('should identify username credentials', () => {
      const result = parseLoginCredential('john_doe123');
      expect(result.type).toBe('username');
      expect(result.normalized).toBe('john_doe123');
      expect(result.original).toBe('john_doe123');
    });

    it('should handle mixed case email', () => {
      const result = parseLoginCredential('John.DOE@EXAMPLE.COM');
      expect(result.type).toBe('email');
      expect(result.normalized).toBe('john.doe@example.com');
      expect(result.original).toBe('John.DOE@EXAMPLE.COM');
    });

    it('should handle mixed case username', () => {
      const result = parseLoginCredential('John_DOE_123');
      expect(result.type).toBe('username');
      expect(result.normalized).toBe('john_doe_123');
      expect(result.original).toBe('John_DOE_123');
    });

    it('should trim whitespace', () => {
      const result = parseLoginCredential('  john.doe@example.com  ');
      expect(result.type).toBe('email');
      expect(result.normalized).toBe('john.doe@example.com');
      expect(result.original).toBe('john.doe@example.com');
    });
  });

  describe('validateUsernameFormat', () => {
    it('should accept valid usernames', () => {
      expect(validateUsernameFormat('john_doe123')).toEqual({ isValid: true });
      expect(validateUsernameFormat('user123')).toEqual({ isValid: true });
      expect(validateUsernameFormat('test_user')).toEqual({ isValid: true });
    });

    it('should reject usernames that are too short', () => {
      const result = validateUsernameFormat('jo');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters long');
    });

    it('should reject usernames that are too long', () => {
      const result = validateUsernameFormat('this_username_is_too_long');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username cannot exceed 15 characters');
    });

    it('should reject usernames with invalid characters', () => {
      const result = validateUsernameFormat('john-doe!');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Username can only contain letters, numbers, and underscores',
      );
    });

    it('should handle whitespace by trimming', () => {
      expect(validateUsernameFormat('  john_doe  ')).toEqual({ isValid: true });
    });

    it('should reject usernames with spaces', () => {
      const result = validateUsernameFormat('john doe');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Username can only contain letters, numbers, and underscores',
      );
    });
  });

  describe('generateUsernameSuggestions', () => {
    it('should generate numbered suggestions', () => {
      const suggestions = generateUsernameSuggestions('john_doe');
      expect(suggestions).toContain('john_doe1');
      expect(suggestions).toContain('john_doe2');
    });

    it('should generate year-based suggestion', () => {
      const currentYear = new Date().getFullYear();
      const suggestions = generateUsernameSuggestions('john_doe');
      expect(suggestions).toContain(`john_doe_${currentYear}`);
    });

    it('should generate random number suggestion for usernames with underscores', () => {
      const suggestions = generateUsernameSuggestions('john_doe');
      // Check that there's at least one suggestion with a number at the end
      const hasRandomNumber = suggestions.some(
        (s) =>
          /john_doe\d+$/.test(s) && !['john_doe1', 'john_doe2'].includes(s),
      );
      expect(hasRandomNumber).toBe(true);
    });

    it('should generate underscore variations for usernames without underscores', () => {
      const suggestions = generateUsernameSuggestions('johndoe');
      expect(suggestions).toContain('johndoe_user');
      expect(suggestions).toContain('the_johndoe');
    });

    it('should not generate underscore variations for usernames with underscores', () => {
      const suggestions = generateUsernameSuggestions('john_doe');
      expect(suggestions).not.toContain('john_doe_user');
      expect(suggestions).not.toContain('the_john_doe');
    });

    it('should clean invalid characters from base username', () => {
      const suggestions = generateUsernameSuggestions('john-doe!@#');
      suggestions.forEach((suggestion) => {
        expect(suggestion).toMatch(/^[a-z0-9_]+$/);
        expect(suggestion).toContain('johndoe');
      });
    });

    it('should return maximum 5 suggestions', () => {
      const suggestions = generateUsernameSuggestions('john_doe');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle mixed case input', () => {
      const suggestions = generateUsernameSuggestions('John_DOE');
      suggestions.forEach((suggestion) => {
        expect(suggestion).toMatch(/^[a-z0-9_]+$/);
        expect(suggestion).toContain('john_doe');
      });
    });
  });
});
