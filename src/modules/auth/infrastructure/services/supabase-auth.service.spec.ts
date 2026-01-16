import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthService } from './supabase-auth.service';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signOut: jest.fn(),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('SupabaseAuthService', () => {
  let service: SupabaseAuthService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
      if (key === 'SUPABASE_PUBLISHABLE_KEY') return 'test-publishable-key';
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseAuthService>(SupabaseAuthService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize with Supabase credentials from config', () => {
      expect(configService.get).toHaveBeenCalledWith('SUPABASE_URL');
      expect(configService.get).toHaveBeenCalledWith(
        'SUPABASE_PUBLISHABLE_KEY',
      );
    });

    it('should throw error if Supabase URL is missing', () => {
      const brokenConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'SUPABASE_URL') return null;
          if (key === 'SUPABASE_PUBLISHABLE_KEY') return 'test-key';
          return null;
        }),
      } as any;

      expect(() => {
        new SupabaseAuthService(brokenConfigService);
      }).toThrow('Supabase URL and PUBLISHABLE_KEY must be defined');
    });

    it('should throw error if Supabase key is missing', () => {
      const brokenConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
          if (key === 'SUPABASE_PUBLISHABLE_KEY') return null;
          return null;
        }),
      } as any;

      expect(() => {
        new SupabaseAuthService(brokenConfigService);
      }).toThrow('Supabase URL and PUBLISHABLE_KEY must be defined');
    });
  });

  describe('validateToken', () => {
    const validToken = 'valid-supabase-token';

    describe('when token is valid', () => {
      it('should return authenticated user data', async () => {
        const mockSupabaseUser = {
          id: 'supabase-user-123',
          email: 'test@example.com',
          user_metadata: {
            first_name: 'John',
            last_name: 'Doe',
          },
        };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        });

        const result = await service.validateToken(validToken);

        expect(result).toEqual({
          id: 'supabase-user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          metadata: mockSupabaseUser.user_metadata,
        });
        expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(
          validToken,
        );
      });

      it('should handle user_metadata with firstName instead of first_name', async () => {
        const mockSupabaseUser = {
          id: 'supabase-user-456',
          email: 'user@example.com',
          user_metadata: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
        };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        });

        const result = await service.validateToken(validToken);

        expect(result?.firstName).toBe('Jane');
        expect(result?.lastName).toBe('Smith');
      });

      it('should prioritize first_name over firstName in metadata', async () => {
        const mockSupabaseUser = {
          id: 'supabase-user-789',
          email: 'priority@example.com',
          user_metadata: {
            first_name: 'FirstName',
            firstName: 'SecondName',
          },
        };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        });

        const result = await service.validateToken(validToken);

        expect(result?.firstName).toBe('FirstName');
      });
    });

    describe('when token is invalid', () => {
      it('should return null if Supabase returns error', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        });

        const result = await service.validateToken('invalid-token');

        expect(result).toBeNull();
      });

      it('should return null if no user data returned', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await service.validateToken('invalid-token');

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should return null on network errors', async () => {
        mockSupabaseClient.auth.getUser.mockRejectedValue(
          new Error('Network error'),
        );

        const result = await service.validateToken(validToken);

        expect(result).toBeNull();
      });

      it('should return null on Supabase SDK errors', async () => {
        mockSupabaseClient.auth.getUser.mockRejectedValue(
          new Error('Supabase SDK error'),
        );

        const result = await service.validateToken(validToken);

        expect(result).toBeNull();
      });
    });
  });

  describe('signOut', () => {
    it('should call Supabase signOut method', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await service.signOut();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('should propagate Supabase signOut errors', async () => {
      mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error('SignOut failed'),
      );

      await expect(service.signOut()).rejects.toThrow('SignOut failed');
    });
  });
});
