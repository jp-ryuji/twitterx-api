/**
 * Common string transformation functions for class-transformer
 */

/**
 * Core string normalization function - trims and optionally converts to lowercase
 * @param value - The string to normalize
 * @param toLowerCase - Whether to convert to lowercase
 * @returns Normalized string
 */
export function normalizeString(value: string, toLowerCase = false): string {
  const trimmed = value.trim();
  return toLowerCase ? trimmed.toLowerCase() : trimmed;
}

/**
 * Safely trims whitespace from string values
 * @param value - The value to transform
 * @returns Trimmed string or original value if not a string
 */
export const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeString(value) : value;

/**
 * Safely trims whitespace and converts to lowercase for case-insensitive handling
 * @param value - The value to transform
 * @returns Trimmed and lowercased string or original value if not a string
 */
export const trimAndLowercase = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeString(value, true) : value;
