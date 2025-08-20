import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SecurityUtils } from '../../auth/utils/security.utils';

export interface UploadResult {
  filePath: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Validate file upload constraints
   */
  validateFile(file: Express.Multer.File): boolean {
    if (!file) {
      return false;
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
        typeof file.originalname === 'string'
      );
    };

    if (!isValidFile(file)) {
      return false;
    }

    return true;
  }

  /**
   * Generate a safe filename for storage
   */
  generateSafeFilename(
    originalName: string,
    userId: string,
    fileType: 'profile' | 'header',
  ): string {
    const timestamp = Date.now();
    const sanitized = SecurityUtils.sanitizeFilename(originalName);

    // Get file extension
    const ext = sanitized.split('.').pop() || 'jpg';
    const nameWithoutExt =
      sanitized.split('.').slice(0, -1).join('.') || 'file';

    // Limit name length
    const limitedName = nameWithoutExt.substring(0, 20);

    return `${userId}_${fileType}_${timestamp}_${limitedName}.${ext}`;
  }

  /**
   * Process uploaded file and return metadata
   */
  processUploadedFile(
    file: Express.Multer.File,
    userId: string,
    fileType: 'profile' | 'header',
  ): UploadResult {
    // Helper functions to safely access file properties
    const getFileSize = (file: Express.Multer.File): number | undefined => {
      if (!('size' in file && 'mimetype' in file && 'originalname' in file)) {
        throw new Error('Invalid file object');
      }
      const fileAny = file;
      if ('size' in fileAny && typeof fileAny.size === 'number') {
        return fileAny.size;
      }
      return undefined;
    };

    const getFileMimeType = (file: Express.Multer.File): string | undefined => {
      const fileAny = file;
      if ('mimetype' in fileAny && typeof fileAny.mimetype === 'string') {
        return fileAny.mimetype;
      }
      return undefined;
    };

    const getFileOriginalName = (
      file: Express.Multer.File,
    ): string | undefined => {
      const fileAny = file;
      if (
        'originalname' in fileAny &&
        typeof fileAny.originalname === 'string'
      ) {
        return fileAny.originalname;
      }
      return undefined;
    };

    const originalname = getFileOriginalName(file) || '';
    const sanitizedFilename = originalname
      ? SecurityUtils.sanitizeFilename(originalname)
      : '';
    const storageFilename = this.generateSafeFilename(
      originalname,
      userId,
      fileType,
    );

    // Determine file path based on environment
    const uploadPath = this.configService.get<string>(
      'UPLOAD_PATH',
      './uploads',
    );
    const filePath = `${uploadPath}/${fileType}s/${storageFilename}`;

    return {
      filePath,
      fileName: storageFilename,
      originalName: sanitizedFilename,
      mimeType: getFileMimeType(file) || '',
      size: getFileSize(file) || 0,
    };
  }

  /**
   * Get allowed MIME types based on file type
   */
  private getAllowedMimeTypes(fileType: 'profile' | 'header'): string[] {
    if (fileType === 'profile') {
      return this.configService.get<string[]>('PROFILE_PICTURE_MIME_TYPES', [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]);
    } else {
      return this.configService.get<string[]>('HEADER_IMAGE_MIME_TYPES', [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]);
    }
  }

  /**
   * Validate image dimensions (stub - would integrate with image processing library)
   */
  validateImageDimensions(
    _fileBuffer: Buffer,
    _fileType: 'profile' | 'header',
  ): boolean {
    // In a real implementation, you would use a library like Sharp to check dimensions
    // This is a placeholder implementation

    try {
      // Placeholder for actual image validation
      // For profile pictures, typical constraints might be:
      // - Minimum: 200x200 pixels
      // - Maximum: 4096x4096 pixels
      // - Aspect ratio: 1:1 for profile pictures

      // For header images, typical constraints might be:
      // - Minimum: 600x200 pixels
      // - Maximum: 4096x4096 pixels
      // - Aspect ratio: 3:1 or similar

      return true; // Placeholder - always return true
    } catch (error) {
      this.logger.error('Error validating image dimensions', error);
      return false;
    }
  }
}
