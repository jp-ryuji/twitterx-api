import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import {
  FileUploadDto,
  ProfilePictureUploadDto,
  HeaderImageUploadDto,
} from './file-upload.dto';

describe('FileUploadDto', () => {
  function createDto(data: Record<string, unknown>): FileUploadDto {
    return plainToClass(FileUploadDto, data);
  }

  describe('originalName', () => {
    it('should accept valid filename', async () => {
      const dto = createDto({
        originalName: 'profile-picture.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        sanitizedFileName: 'user123_profile_20230101.jpg',
      });
      const errors = await validate(dto);
      const originalNameErrors = errors.filter(
        (error) => error.property === 'originalName',
      );

      expect(originalNameErrors.length).toBe(0);
    });

    it('should reject filename that is too long', async () => {
      const dto = createDto({
        originalName: 'A'.repeat(256),
        mimeType: 'image/jpeg',
        size: 102400,
        sanitizedFileName: 'user123_profile_20230101.jpg',
      });
      const errors = await validate(dto);
      const originalNameErrors = errors.filter(
        (error) => error.property === 'originalName',
      );

      expect(originalNameErrors.length).toBeGreaterThan(0);
      expect(originalNameErrors[0].property).toBe('originalName');
    });

    it('should reject empty filename', async () => {
      const dto = createDto({
        originalName: '',
        mimeType: 'image/jpeg',
        size: 102400,
        sanitizedFileName: 'user123_profile_20230101.jpg',
      });
      const errors = await validate(dto);
      const originalNameErrors = errors.filter(
        (error) => error.property === 'originalName',
      );

      expect(originalNameErrors.length).toBeGreaterThan(0);
      expect(originalNameErrors[0].property).toBe('originalName');
    });
  });

  describe('mimeType', () => {
    it('should accept valid MIME type', async () => {
      const dto = createDto({
        originalName: 'profile-picture.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        sanitizedFileName: 'user123_profile_20230101.jpg',
      });
      const errors = await validate(dto);
      const mimeTypeErrors = errors.filter(
        (error) => error.property === 'mimeType',
      );

      expect(mimeTypeErrors.length).toBe(0);
    });

    it('should reject empty MIME type', async () => {
      const dto = createDto({
        originalName: 'profile-picture.jpg',
        mimeType: '',
        size: 102400,
        sanitizedFileName: 'user123_profile_20230101.jpg',
      });
      const errors = await validate(dto);
      const mimeTypeErrors = errors.filter(
        (error) => error.property === 'mimeType',
      );

      expect(mimeTypeErrors.length).toBeGreaterThan(0);
      expect(mimeTypeErrors[0].property).toBe('mimeType');
    });
  });

  describe('size', () => {
    it('should accept valid size', async () => {
      const dto = createDto({
        originalName: 'profile-picture.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        sanitizedFileName: 'user123_profile_20230101.jpg',
      });
      const errors = await validate(dto);
      const sizeErrors = errors.filter((error) => error.property === 'size');

      expect(sizeErrors.length).toBe(0);
    });
  });

  describe('sanitizedFileName', () => {
    it('should accept valid sanitized filename', async () => {
      const dto = createDto({
        originalName: 'profile-picture.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        sanitizedFileName: 'user123_profile_20230101.jpg',
      });
      const errors = await validate(dto);
      const sanitizedFileNameErrors = errors.filter(
        (error) => error.property === 'sanitizedFileName',
      );

      expect(sanitizedFileNameErrors.length).toBe(0);
    });

    it('should reject filename that is too long', async () => {
      const dto = createDto({
        originalName: 'profile-picture.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        sanitizedFileName: 'A'.repeat(256),
      });
      const errors = await validate(dto);
      const sanitizedFileNameErrors = errors.filter(
        (error) => error.property === 'sanitizedFileName',
      );

      expect(sanitizedFileNameErrors.length).toBeGreaterThan(0);
      expect(sanitizedFileNameErrors[0].property).toBe('sanitizedFileName');
    });

    it('should reject empty filename', async () => {
      const dto = createDto({
        originalName: 'profile-picture.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        sanitizedFileName: '',
      });
      const errors = await validate(dto);
      const sanitizedFileNameErrors = errors.filter(
        (error) => error.property === 'sanitizedFileName',
      );

      expect(sanitizedFileNameErrors.length).toBeGreaterThan(0);
      expect(sanitizedFileNameErrors[0].property).toBe('sanitizedFileName');
    });
  });
});

describe('ProfilePictureUploadDto', () => {
  function createDto(data: Record<string, unknown>): ProfilePictureUploadDto {
    return plainToClass(ProfilePictureUploadDto, data);
  }

  it('should accept valid file', async () => {
    const dto = createDto({ file: {} });
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept missing file (optional)', async () => {
    const dto = createDto({});
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});

describe('HeaderImageUploadDto', () => {
  function createDto(data: Record<string, unknown>): HeaderImageUploadDto {
    return plainToClass(HeaderImageUploadDto, data);
  }

  it('should accept valid file', async () => {
    const dto = createDto({ file: {} });
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept missing file (optional)', async () => {
    const dto = createDto({});
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
