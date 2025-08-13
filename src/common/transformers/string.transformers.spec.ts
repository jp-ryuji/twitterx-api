import { trimString, trimAndLowercase } from './string.transformers';

describe('String Transformers', () => {
  describe('trimString', () => {
    it('should trim whitespace from string values', () => {
      const result = trimString({ value: '  hello world  ' });
      expect(result).toBe('hello world');
    });

    it('should preserve non-string values unchanged', () => {
      expect(trimString({ value: 123 })).toBe(123);
      expect(trimString({ value: null })).toBe(null);
      expect(trimString({ value: undefined })).toBe(undefined);
      expect(trimString({ value: {} })).toEqual({});
      expect(trimString({ value: [] })).toEqual([]);
    });

    it('should handle empty strings', () => {
      expect(trimString({ value: '' })).toBe('');
      expect(trimString({ value: '   ' })).toBe('');
    });

    it('should handle strings with only leading whitespace', () => {
      expect(trimString({ value: '  hello' })).toBe('hello');
    });

    it('should handle strings with only trailing whitespace', () => {
      expect(trimString({ value: 'hello  ' })).toBe('hello');
    });
  });

  describe('trimAndLowercase', () => {
    it('should trim whitespace and convert to lowercase', () => {
      const result = trimAndLowercase({ value: '  HELLO World  ' });
      expect(result).toBe('hello world');
    });

    it('should handle mixed case with whitespace', () => {
      const result = trimAndLowercase({ value: '  John.DOE@EXAMPLE.COM  ' });
      expect(result).toBe('john.doe@example.com');
    });

    it('should preserve non-string values unchanged', () => {
      expect(trimAndLowercase({ value: 123 })).toBe(123);
      expect(trimAndLowercase({ value: null })).toBe(null);
      expect(trimAndLowercase({ value: undefined })).toBe(undefined);
      expect(trimAndLowercase({ value: {} })).toEqual({});
      expect(trimAndLowercase({ value: [] })).toEqual([]);
    });

    it('should handle empty strings', () => {
      expect(trimAndLowercase({ value: '' })).toBe('');
      expect(trimAndLowercase({ value: '   ' })).toBe('');
    });

    it('should handle strings that are already lowercase', () => {
      expect(trimAndLowercase({ value: '  hello world  ' })).toBe(
        'hello world',
      );
    });

    it('should handle strings with special characters', () => {
      expect(trimAndLowercase({ value: '  User@DOMAIN.COM  ' })).toBe(
        'user@domain.com',
      );
    });
  });
});
