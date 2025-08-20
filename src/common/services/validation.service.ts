import { Injectable } from '@nestjs/common';

import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

import { SecurityUtils } from '../../auth/utils/security.utils';

@Injectable()
export class ValidationService {
  /**
   * Validate DTO and return errors if any
   */
  async validateDto<T extends object>(
    dtoClass: new () => T,
    data: Record<string, unknown>,
  ): Promise<ValidationError[]> {
    const dto = plainToClass(dtoClass, data);
    return validate(dto);
  }

  /**
   * Sanitize user input to prevent XSS and other attacks
   */
  sanitizeInput(input: string): string {
    return SecurityUtils.sanitizeString(input);
  }

  /**
   * Sanitize email input
   */
  sanitizeEmail(email: string): string {
    return SecurityUtils.sanitizeEmail(email);
  }

  /**
   * Sanitize username input
   */
  sanitizeUsername(username: string): string {
    return SecurityUtils.sanitizeUsername(username);
  }

  /**
   * Sanitize URL input
   */
  sanitizeUrl(url: string): string {
    return SecurityUtils.sanitizeUrl(url);
  }

  /**
   * Sanitize general text input
   */
  sanitizeText(text: string): string {
    return SecurityUtils.sanitizeText(text);
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    return SecurityUtils.sanitizeFilename(filename);
  }

  /**
   * Check for SQL injection patterns
   */
  containsSqlInjection(input: string): boolean {
    return SecurityUtils.containsSqlInjection(input);
  }

  /**
   * Format validation errors for API responses
   */
  formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    for (const error of errors) {
      if (error.constraints) {
        formattedErrors[error.property] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        const childErrors = this.formatValidationErrors(error.children);
        Object.assign(formattedErrors, childErrors);
      }
    }

    return formattedErrors;
  }

  /**
   * Validate and sanitize file upload
   */
  validateFileUpload(
    file: Express.Multer.File,
    maxSize: number,
    allowedTypes: string[],
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Type guard for file properties
    const isValidFile = (file: unknown): file is Express.Multer.File => {
      if (!file || typeof file !== 'object') {
        return false;
      }

      return (
        'size' in file &&
        typeof file.size === 'number' &&
        'mimetype' in file &&
        typeof file.mimetype === 'string' &&
        'originalname' in file &&
        'originalname' in file &&
        typeof file.originalname === 'string'
      );
    };

    if (isValidFile(file)) {
      if (file.size > maxSize) {
        errors.push(
          `File size exceeds maximum allowed size of ${maxSize} bytes`,
        );
      }

      if (!allowedTypes.includes(file.mimetype)) {
        errors.push(
          `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(
            ', ',
          )}`,
        );
      }

      const sanitizedFilename = this.sanitizeFilename(file.originalname);
      if (sanitizedFilename !== file.originalname) {
        errors.push('Filename contains invalid characters');
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}
