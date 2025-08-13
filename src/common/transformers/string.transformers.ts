/**
 * Common string transformation functions for class-transformer
 */

/**
 * Safely trims whitespace from string values
 * @param value - The value to transform
 * @returns Trimmed string or original value if not a string
 */
export const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Safely trims whitespace and converts to lowercase for case-insensitive handling
 * @param value - The value to transform
 * @returns Trimmed and lowercased string or original value if not a string
 */
export const trimAndLowercase = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
