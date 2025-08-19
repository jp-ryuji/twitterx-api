import { Readable } from 'stream';

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { FileUploadService } from './file-upload.service';

describe('FileUploadService', () => {
  let service: FileUploadService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              switch (key) {
                case 'UPLOAD_PATH':
                  return './uploads';
                default:
                  return defaultValue;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024000,
      destination: './uploads',
      filename: 'test123.jpg',
      path: './uploads/test123.jpg',
      buffer: Buffer.from('test'),
      stream: new Readable(),
    };

    it('should validate a valid file', () => {
      const result = service.validateFile(mockFile);
      expect(result).toBe(true);
    });

    it('should reject null file', () => {
      const result = service.validateFile(null as any);
      expect(result).toBe(false);
    });

    it('should reject invalid file object', () => {
      const invalidFile = { ...mockFile, size: 'not-a-number' };
      const result = service.validateFile(invalidFile as any);
      expect(result).toBe(false);
    });
  });

  describe('generateSafeFilename', () => {
    it('should generate a safe filename with timestamp', () => {
      const originalName = 'test.jpg';
      const userId = 'user123';
      const result = service.generateSafeFilename(
        originalName,
        userId,
        'profile',
      );

      // Check that the filename follows the expected pattern
      expect(result).toMatch(/^user123_profile_\d+_test\.jpg$/);
    });

    it('should handle filenames with multiple dots', () => {
      const originalName = 'test.profile.image.jpg';
      const userId = 'user123';
      const result = service.generateSafeFilename(
        originalName,
        userId,
        'profile',
      );

      // Check that the filename follows the expected pattern
      expect(result).toMatch(/^user123_profile_\d+_test\.profile\.image\.jpg$/);
    });

    it('should sanitize unsafe characters in filename', () => {
      // This is handled by the SecurityUtils.sanitizeFilename function
      const originalName = 'test<script>alert(1)</script>.jpg';
      const userId = 'user123';
      const result = service.generateSafeFilename(
        originalName,
        userId,
        'profile',
      );

      // The result should be sanitized by SecurityUtils
      expect(result).toMatch(
        /^user123_profile_\d+_test_script_alert_1_\.(jpg|_)$/,
      );
    });
  });

  describe('processUploadedFile', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024000,
      destination: './uploads',
      filename: 'test123.jpg',
      path: './uploads/test123.jpg',
      buffer: Buffer.from('test'),
      stream: new Readable(),
    };

    it('should process uploaded profile picture', () => {
      const userId = 'user123';
      const result = service.processUploadedFile(mockFile, userId, 'profile');

      expect(result).toEqual({
        filePath:
          './uploads/profiles/user123_profile_' +
          result.fileName.split('_')[2] +
          '_test.jpg',
        fileName: result.fileName,
        originalName: 'test.jpg', // Sanitized by SecurityUtils, but we're checking the original in the service
        mimeType: 'image/jpeg',
        size: 1024000,
      });

      // Check fileName format separately
      expect(result.fileName).toMatch(/^user123_profile_\d+_test\.jpg$/);
      expect(result.filePath).toMatch(
        /^\.\/uploads\/profiles\/user123_profile_\d+_test\.jpg$/,
      );
    });

    it('should process uploaded header image', () => {
      const userId = 'user123';
      const result = service.processUploadedFile(mockFile, userId, 'header');

      expect(result).toEqual({
        filePath:
          './uploads/headers/user123_header_' +
          result.fileName.split('_')[2] +
          '_test.jpg',
        fileName: result.fileName,
        originalName: 'test.jpg', // Sanitized by SecurityUtils, but we're checking the original in the service
        mimeType: 'image/jpeg',
        size: 1024000,
      });

      // Check fileName format separately
      expect(result.fileName).toMatch(/^user123_header_\d+_test\.jpg$/);
      expect(result.filePath).toMatch(
        /^\.\/uploads\/headers\/user123_header_\d+_test\.jpg$/,
      );
    });
  });

  describe('validateImageDimensions', () => {
    it('should validate image dimensions (placeholder)', () => {
      const buffer = Buffer.from('test');
      const result = service.validateImageDimensions(buffer, 'profile');
      expect(result).toBe(true); // Placeholder always returns true
    });
  });
});
