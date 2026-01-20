import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseAdminService } from './supabase-admin.service';

// Mock the Supabase client
const mockAdminAuth = {
  createUser: jest.fn(),
  inviteUserByEmail: jest.fn(),
  deleteUser: jest.fn(),
  getUserById: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: mockAdminAuth,
    },
  })),
}));

describe('SupabaseAdminService', () => {
  let service: SupabaseAdminService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SECRET_KEY: 'test-secret-key',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAdminService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseAdminService>(SupabaseAdminService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user in Supabase Auth', async () => {
      const mockUser = {
        id: 'supabase-user-123',
        email: 'test@example.com',
      };

      mockAdminAuth.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.createUser({
        email: 'test@example.com',
        emailConfirm: true,
        userData: { firstName: 'John' },
      });

      expect(result).toEqual({
        id: 'supabase-user-123',
        email: 'test@example.com',
      });
      expect(mockAdminAuth.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        email_confirm: true,
        user_metadata: { firstName: 'John' },
      });
    });

    it('should throw error when Supabase returns error', async () => {
      mockAdminAuth.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already exists' },
      });

      await expect(
        service.createUser({ email: 'existing@example.com' }),
      ).rejects.toThrow('Failed to create Supabase user: User already exists');
    });

    it('should throw error when no user is returned', async () => {
      mockAdminAuth.createUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        service.createUser({ email: 'test@example.com' }),
      ).rejects.toThrow('Failed to create Supabase user: No user returned');
    });
  });

  describe('inviteUserByEmail', () => {
    it('should invite a user by email', async () => {
      const mockUser = {
        id: 'supabase-user-456',
        email: 'invite@example.com',
      };

      mockAdminAuth.inviteUserByEmail.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.inviteUserByEmail('invite@example.com');

      expect(result).toEqual({
        id: 'supabase-user-456',
        email: 'invite@example.com',
      });
      expect(mockAdminAuth.inviteUserByEmail).toHaveBeenCalledWith(
        'invite@example.com',
      );
    });

    it('should throw error when invite fails', async () => {
      mockAdminAuth.inviteUserByEmail.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid email' },
      });

      await expect(
        service.inviteUserByEmail('invalid-email'),
      ).rejects.toThrow('Failed to invite user: Invalid email');
    });

    it('should throw error when no user is returned from invite', async () => {
      mockAdminAuth.inviteUserByEmail.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        service.inviteUserByEmail('test@example.com'),
      ).rejects.toThrow('Failed to invite user: No user returned');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user from Supabase Auth', async () => {
      mockAdminAuth.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      await expect(
        service.deleteUser('supabase-user-123'),
      ).resolves.not.toThrow();

      expect(mockAdminAuth.deleteUser).toHaveBeenCalledWith('supabase-user-123');
    });

    it('should throw error when delete fails', async () => {
      mockAdminAuth.deleteUser.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      await expect(
        service.deleteUser('non-existent-user'),
      ).rejects.toThrow('Failed to delete Supabase user: User not found');
    });
  });

  describe('getUserById', () => {
    it('should get a user by ID', async () => {
      const mockUser = {
        id: 'supabase-user-789',
        email: 'found@example.com',
      };

      mockAdminAuth.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.getUserById('supabase-user-789');

      expect(result).toEqual({
        id: 'supabase-user-789',
        email: 'found@example.com',
      });
      expect(mockAdminAuth.getUserById).toHaveBeenCalledWith('supabase-user-789');
    });

    it('should return null when user not found', async () => {
      mockAdminAuth.getUserById.mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found' },
      });

      const result = await service.getUserById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null when no user data is returned', async () => {
      mockAdminAuth.getUserById.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await service.getUserById('some-id');

      expect(result).toBeNull();
    });
  });
});
