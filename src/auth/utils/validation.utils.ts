import { normalizeString } from '../../common/transformers/string.transformers';

/**
 * Utility functions for authentication validation
 */

/**
 * Normalizes username for case-insensitive comparison
 * @param username - The username to normalize
 * @returns Normalized username (lowercase, trimmed)
 */
export function normalizeUsername(username: string): string {
  return normalizeString(username, true);
}

/**
 * Normalizes email for case-insensitive comparison
 * @param email - The email to normalize
 * @returns Normalized email (lowercase, trimmed)
 */
export function normalizeEmail(email: string): string {
  return normalizeString(email, true);
}

/**
 * Checks if a string is a valid email format
 * @param value - The string to check
 * @returns True if the string appears to be an email
 */
export function isEmailFormat(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Determines if the login credential is an email or username
 * @param credential - The login credential (email or username)
 * @returns Object indicating the type and normalized value
 */
export function parseLoginCredential(credential: string): {
  type: 'email' | 'username';
  normalized: string;
  original: string;
} {
  const trimmed = credential.trim();
  const isEmail = isEmailFormat(trimmed);

  return {
    type: isEmail ? 'email' : 'username',
    normalized: trimmed.toLowerCase(),
    original: trimmed,
  };
}

/**
 * Validates username format according to Twitter-like rules
 * @param username - The username to validate
 * @returns Validation result with success flag and error message
 */
export function validateUsernameFormat(username: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters long',
    };
  }

  if (trimmed.length > 15) {
    return { isValid: false, error: 'Username cannot exceed 15 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, and underscores',
    };
  }

  return { isValid: true };
}

/**
 * Generates username suggestions when the desired username is taken
 * @param baseUsername - The original username that was taken
 * @returns Array of suggested alternative usernames
 */
export function generateUsernameSuggestions(baseUsername: string): string[] {
  const base = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const suggestions: string[] = [];

  // Add numbers to the end
  for (let i = 1; i <= 2; i++) {
    suggestions.push(`${base}${i}`);
  }

  // Add current year
  const currentYear = new Date().getFullYear();
  suggestions.push(`${base}_${currentYear}`);

  // Add underscore variations
  if (!base.includes('_')) {
    suggestions.push(`${base}_user`);
    suggestions.push(`the_${base}`);
  } else {
    // Add random numbers for usernames that already have underscores
    const randomNum = Math.floor(Math.random() * 999) + 1;
    suggestions.push(`${base}${randomNum}`);
  }

  return suggestions.slice(0, 5); // Return max 5 suggestions
}
