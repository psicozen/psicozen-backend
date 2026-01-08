import { FileSchema } from './file.schema';

describe('FileSchema', () => {
  it('should be defined', () => {
    expect(FileSchema).toBeDefined();
  });

  it('should create instance with all required properties', () => {
    const file = new FileSchema();
    file.id = 'file-123';
    file.originalName = 'document.pdf';
    file.storagePath = 'uploads/2024/document.pdf';
    file.mimeType = 'application/pdf';
    file.size = 102400;
    file.url = 'https://storage.example.com/document.pdf';
    file.isPublic = false;
    file.uploadedBy = 'user-123';
    file.metadata = {};

    expect(file.id).toBe('file-123');
    expect(file.originalName).toBe('document.pdf');
    expect(file.storagePath).toBe('uploads/2024/document.pdf');
    expect(file.mimeType).toBe('application/pdf');
    expect(file.size).toBe(102400);
    expect(file.url).toBe('https://storage.example.com/document.pdf');
    expect(file.isPublic).toBe(false);
    expect(file.uploadedBy).toBe('user-123');
    expect(file.metadata).toEqual({});
  });

  it('should support public files', () => {
    const file = new FileSchema();
    file.isPublic = true;

    expect(file.isPublic).toBe(true);
  });

  it('should support metadata as JSONB', () => {
    const file = new FileSchema();
    file.metadata = {
      width: 1920,
      height: 1080,
      duration: 120,
      tags: ['video', 'tutorial'],
    };

    expect(file.metadata.width).toBe(1920);
    expect(file.metadata.tags).toContain('video');
  });

  it('should have timestamps', () => {
    const file = new FileSchema();
    file.createdAt = new Date();
    file.updatedAt = new Date();

    expect(file.createdAt).toBeInstanceOf(Date);
    expect(file.updatedAt).toBeInstanceOf(Date);
  });

  it('should support different file types', () => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const docTypes = ['application/pdf', 'application/msword'];

    [...imageTypes, ...docTypes].forEach((mimeType) => {
      const file = new FileSchema();
      file.mimeType = mimeType;
      expect(file.mimeType).toBe(mimeType);
    });
  });
});
