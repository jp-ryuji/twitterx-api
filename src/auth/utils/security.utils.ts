import * as validator from 'validator';

/**
 * Security utilities for input sanitization and validation
 */
export class SecurityUtils {
  /**
   * Sanitize string input to prevent XSS attacks
   */
  static sanitizeString(input: string): string {
    if (!input) return '';

    // Escape HTML entities
    return validator.escape(input.trim());
  }

  /**
   * Sanitize and validate email input
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';

    const sanitized = validator.normalizeEmail(email.trim().toLowerCase(), {
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false,
    });

    return sanitized || '';
  }

  /**
   * Sanitize username input
   */
  static sanitizeUsername(username: string): string {
    if (!username) return '';

    // Remove any non-alphanumeric characters except underscores
    return username.trim().replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Validate and sanitize URL input
   */
  static sanitizeUrl(url: string): string {
    if (!url) return '';

    const trimmed = url.trim();

    // Check if it's a valid URL
    if (
      !validator.isURL(trimmed, {
        protocols: ['http', 'https'],
        require_protocol: true,
      })
    ) {
      return '';
    }

    return trimmed;
  }

  /**
   * Remove potentially dangerous characters from general text input
   */
  static sanitizeText(text: string): string {
    if (!text) return '';

    // Remove null bytes and control characters except newlines and tabs
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  }

  /**
   * Validate IP address format
   */
  static isValidIpAddress(ip: string): boolean {
    return validator.isIP(ip);
  }

  /**
   * Check if string contains only safe characters for display names
   */
  static isValidDisplayName(displayName: string): boolean {
    if (!displayName) return true;

    // Allow letters, numbers, spaces, and common punctuation
    const safePattern = /^[a-zA-Z0-9\s\-_.,'!?()]+$/;
    return safePattern.test(displayName) && displayName.length <= 50;
  }

  /**
   * Check if bio contains safe content
   */
  static isValidBio(bio: string): boolean {
    if (!bio) return true;

    // Allow most characters but check length
    return bio.length <= 160;
  }

  /**
   * Generate a safe filename from user input
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';

    // Remove path traversal attempts and dangerous characters
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, '')
      .substring(0, 255);
  }

  /**
   * Check for common SQL injection patterns (additional layer of protection)
   */
  static containsSqlInjection(input: string): boolean {
    if (!input) return false;

    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\/\*|\*\/|;)/,
      /(\b(OR|AND)\b.*=.*)/i,
      /'.*'/,
    ];

    return sqlPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Rate limiting key generation for IP addresses
   */
  static generateRateLimitKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }
}
