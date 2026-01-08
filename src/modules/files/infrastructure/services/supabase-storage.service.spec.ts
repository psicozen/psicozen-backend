import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseStorageService } from './supabase-storage.service';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const mockSupabaseService = {
      getStorage: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          upload: jest.fn(),
          remove: jest.fn(),
          getPublicUrl: jest.fn(),
          createSignedUrl: jest.fn(),
        }),
      }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseStorageService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseStorageService>(SupabaseStorageService);
    supabaseService = module.get(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload file successfully', async () => {
      const filePath = 'uploads/test.pdf';
      const buffer = Buffer.from('test content');
      const mimeType = 'application/pdf';

      const mockStorage = supabaseService.getStorage().from('uploads');
      (mockStorage.upload as jest.Mock).mockResolvedValue({
        data: { path: filePath },
        error: null,
      });

      (mockStorage.getPublicUrl as jest.Mock).mockReturnValue({
        data: { publicUrl: 'https://example.com/test.pdf' },
      });

      const result = await service.upload(filePath, buffer, mimeType, true);

      expect(result.path).toBe(filePath);
      expect(result.url).toBe('https://example.com/test.pdf');
    });

    it('should throw error when upload fails', async () => {
      const mockStorage = supabaseService.getStorage().from('uploads');
      (mockStorage.upload as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      await expect(
        service.upload('test.pdf', Buffer.from('test'), 'text/plain', false),
      ).rejects.toThrow('Failed to upload file: Upload failed');
    });
  });

  describe('delete', () => {
    it('should delete file successfully', async () => {
      const mockStorage = supabaseService.getStorage().from('uploads');
      (mockStorage.remove as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      await expect(service.delete('uploads/test.pdf')).resolves.not.toThrow();
    });

    it('should throw error when delete fails', async () => {
      const mockStorage = supabaseService.getStorage().from('uploads');
      (mockStorage.remove as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      await expect(service.delete('test.pdf')).rejects.toThrow(
        'Failed to delete file: Delete failed',
      );
    });
  });

  describe('getPublicUrl', () => {
    it('should return public URL', () => {
      const filePath = 'uploads/test.pdf';
      const mockStorage = supabaseService.getStorage().from('uploads');
      (mockStorage.getPublicUrl as jest.Mock).mockReturnValue({
        data: { publicUrl: 'https://example.com/test.pdf' },
      });

      const url = service.getPublicUrl(filePath);

      expect(url).toBe('https://example.com/test.pdf');
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL with default expiration', async () => {
      const filePath = 'uploads/private.pdf';
      const mockStorage = supabaseService.getStorage().from('uploads');
      (mockStorage.createSignedUrl as jest.Mock).mockResolvedValue({
        data: { signedUrl: 'https://example.com/private.pdf?token=abc' },
        error: null,
      });

      const url = await service.getSignedUrl(filePath);

      expect(url).toBe('https://example.com/private.pdf?token=abc');
      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(filePath, 3600);
    });

    it('should return signed URL with custom expiration', async () => {
      const mockStorage = supabaseService.getStorage().from('uploads');
      (mockStorage.createSignedUrl as jest.Mock).mockResolvedValue({
        data: { signedUrl: 'https://example.com/file.pdf?token=xyz' },
        error: null,
      });

      await service.getSignedUrl('file.pdf', 7200);

      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith('file.pdf', 7200);
    });

    it('should throw error when signed URL creation fails', async () => {
      const mockStorage = supabaseService.getStorage().from('uploads');
      (mockStorage.createSignedUrl as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'URL creation failed' },
      });

      await expect(service.getSignedUrl('test.pdf')).rejects.toThrow(
        'Failed to create signed URL: URL creation failed',
      );
    });
  });
});
