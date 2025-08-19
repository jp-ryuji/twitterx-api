import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

import { SecurityUtils } from '../../auth/utils/security.utils';

/**
 * Custom validator for display names
 */
@ValidatorConstraint({ name: 'isSafeDisplayName', async: false })
export class IsSafeDisplayName implements ValidatorConstraintInterface {
  validate(text: string) {
    if (text === undefined || text === null) return true;
    return SecurityUtils.isValidDisplayName(text);
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Display name contains invalid characters or is too long (maximum 50 characters)';
  }
}

/**
 * Custom validator for bio content
 */
@ValidatorConstraint({ name: 'isSafeBio', async: false })
export class IsSafeBio implements ValidatorConstraintInterface {
  validate(text: string) {
    if (text === undefined || text === null) return true;
    return SecurityUtils.isValidBio(text);
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Bio is too long (maximum 160 characters)';
  }
}

/**
 * Custom validator for safe text input
 */
@ValidatorConstraint({ name: 'isSafeText', async: false })
export class IsSafeText implements ValidatorConstraintInterface {
  validate(text: string) {
    if (text === undefined || text === null) return true;

    // Check for SQL injection patterns
    if (SecurityUtils.containsSqlInjection(text)) {
      return false;
    }

    // Check if it's safe display name (allows most chars but limits length)
    return text.length <= 1000; // General limit for text fields
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Text contains potentially unsafe content or is too long';
  }
}

/**
 * Custom validator for usernames
 */
@ValidatorConstraint({ name: 'isSafeUsername', async: false })
export class IsSafeUsername implements ValidatorConstraintInterface {
  validate(username: string) {
    if (username === undefined || username === null) return true;

    // Check for SQL injection
    if (SecurityUtils.containsSqlInjection(username)) {
      return false;
    }

    // Check length and format
    const sanitized = SecurityUtils.sanitizeUsername(username);
    return (
      sanitized === username && // Ensure no characters were removed
      username.length >= 3 &&
      username.length <= 15
    );
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Username contains invalid characters or is not between 3-15 characters';
  }
}

/**
 * Custom validator for location strings
 */
@ValidatorConstraint({ name: 'isSafeLocation', async: false })
export class IsSafeLocation implements ValidatorConstraintInterface {
  validate(location: string) {
    if (location === undefined || location === null) return true;

    // Check for SQL injection
    if (SecurityUtils.containsSqlInjection(location)) {
      return false;
    }

    // Check length
    return location.length <= 30;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Location is too long (maximum 30 characters) or contains unsafe content';
  }
}
