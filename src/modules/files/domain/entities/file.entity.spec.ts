import { FileEntity } from './file.entity';

describe('FileEntity', () => {
  describe('create', () => {
    it('should create a file entity with all required fields', () => {
      const originalName = 'document.pdf';
      const storagePath = 'uploads/2024/document.pdf';
      const mimeType = 'application/pdf';
      const size = 102400; // 100KB
      const url = 'https://storage.supabase.co/uploads/2024/document.pdf';
      const uploadedBy = 'user-123';
      const isPublic = false;

      const file = FileEntity.create(
        originalName,
        storagePath,
        mimeType,
        size,
        url,
        uploadedBy,
        isPublic,
      );

      expect(file.originalName).toBe(originalName);
      expect(file.storagePath).toBe(storagePath);
      expect(file.mimeType).toBe(mimeType);
      expect(file.size).toBe(size);
      expect(file.url).toBe(url);
      expect(file.uploadedBy).toBe(uploadedBy);
      expect(file.isPublic).toBe(isPublic);
      expect(file.metadata).toEqual({});
      expect(file.createdAt).toBeInstanceOf(Date);
      expect(file.updatedAt).toBeInstanceOf(Date);
    });

    it('should create public file when isPublic is true', () => {
      const file = FileEntity.create(
        'image.png',
        'uploads/image.png',
        'image/png',
        50000,
        'https://example.com/image.png',
        'user-123',
        true,
      );

      expect(file.isPublic).toBe(true);
    });

    it('should create private file by default', () => {
      const file = FileEntity.create(
        'private.pdf',
        'uploads/private.pdf',
        'application/pdf',
        10000,
        'https://example.com/private.pdf',
        'user-123',
      );

      expect(file.isPublic).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create file from partial data', () => {
      const partial = {
        id: 'file-123',
        originalName: 'test.txt',
        size: 1024,
        metadata: { width: 1920, height: 1080 },
      };

      const file = new FileEntity(partial);

      expect(file.id).toBe(partial.id);
      expect(file.originalName).toBe(partial.originalName);
      expect(file.size).toBe(partial.size);
      expect(file.metadata).toEqual(partial.metadata);
    });

    it('should support custom metadata', () => {
      const file = FileEntity.create(
        'video.mp4',
        'uploads/video.mp4',
        'video/mp4',
        5000000,
        'https://example.com/video.mp4',
        'user-123',
      );

      file.metadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        codec: 'h264',
      };

      expect(file.metadata.duration).toBe(120);
      expect(file.metadata.width).toBe(1920);
    });
  });
});
