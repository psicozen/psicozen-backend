import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from './user.repository';
import { UserSchema } from '../persistence/user.schema';
import { UserEntity } from '../../domain/entities/user.entity';
import { Role } from '../../../roles/domain/enums/role.enum';

describe('UserRepository', () => {
  let repository: UserRepository;
  let typeOrmRepository: jest.Mocked<Repository<UserSchema>>;
  let mockQueryBuilder: {
    select: jest.Mock;
    from: jest.Mock;
    innerJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getRawMany: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getMany: jest.fn(),
    };

    const mockTypeOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(UserSchema),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    typeOrmRepository = module.get(getRepositoryToken(UserSchema));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockSchema = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        preferences: {
          language: 'en',
          theme: 'light',
          notifications: true,
          timezone: 'UTC',
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserSchema;

      typeOrmRepository.findOne.mockResolvedValue(mockSchema);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toBeInstanceOf(UserEntity);
      expect(result?.email).toBe('test@example.com');
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findBySupabaseUserId', () => {
    it('should find user by supabase user ID', async () => {
      const mockSchema = {
        id: 'user-123',
        email: 'test@example.com',
        supabaseUserId: 'supabase-456',
        preferences: {
          language: 'en',
          theme: 'light',
          notifications: true,
          timezone: 'UTC',
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserSchema;

      typeOrmRepository.findOne.mockResolvedValue(mockSchema);

      const result = await repository.findBySupabaseUserId('supabase-456');

      expect(result).toBeInstanceOf(UserEntity);
      expect(result?.supabaseUserId).toBe('supabase-456');
    });

    it('should return null when user not found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findBySupabaseUserId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('existsByEmail', () => {
    it('should return true when email exists', async () => {
      typeOrmRepository.count.mockResolvedValue(1);

      const result = await repository.existsByEmail('existing@example.com');

      expect(result).toBe(true);
      expect(typeOrmRepository.count).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
      });
    });

    it('should return false when email does not exist', async () => {
      typeOrmRepository.count.mockResolvedValue(0);

      const result = await repository.existsByEmail('new@example.com');

      expect(result).toBe(false);
    });
  });

  describe('toDomain', () => {
    it('should convert schema to domain entity', () => {
      const mockSchema = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/photo.jpg',
        bio: 'Software developer',
        preferences: {
          language: 'en',
          theme: 'dark',
          notifications: true,
          timezone: 'UTC',
        },
        supabaseUserId: 'supabase-456',
        isActive: true,
        lastLoginAt: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as UserSchema;

      const entity = repository.toDomain(mockSchema);

      expect(entity).toBeInstanceOf(UserEntity);
      expect(entity.id).toBe(mockSchema.id);
      expect(entity.email).toBe(mockSchema.email);
      expect(entity.firstName).toBe(mockSchema.firstName);
      expect(entity.preferences).toEqual(mockSchema.preferences);
    });
  });

  describe('toEntity', () => {
    it('should convert domain to schema', () => {
      const domain = UserEntity.create(
        'test@example.com',
        'supabase-123',
        'John',
      );
      domain.id = 'user-123';
      domain.lastName = 'Doe';

      const schema = repository.toEntity(domain);

      expect(schema).toBeInstanceOf(UserSchema);
      expect(schema.email).toBe(domain.email);
      expect(schema.firstName).toBe(domain.firstName);
      expect(schema.lastName).toBe(domain.lastName);
      expect(schema.supabaseUserId).toBe(domain.supabaseUserId);
    });
  });

  describe('getRolesByOrganization', () => {
    it('should return roles for a specific organization including system roles', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { roleName: 'admin' },
        { roleName: 'super_admin' },
      ]);

      const result = await repository.getRolesByOrganization(
        userId,
        organizationId,
      );

      expect(result).toEqual([Role.ADMIN, Role.SUPER_ADMIN]);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'user_roles',
        'ur',
        'ur.user_id = users.id',
      );
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'roles',
        'r',
        'r.id = ur.role_id',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'users.id = :userId',
        { userId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(ur.organization_id = :organizationId OR ur.organization_id IS NULL)',
        { organizationId },
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'DISTINCT r.name',
        'roleName',
      );
    });

    it('should return only system roles when no organizationId is provided', async () => {
      const userId = 'user-123';

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { roleName: 'super_admin' },
      ]);

      const result = await repository.getRolesByOrganization(userId);

      expect(result).toEqual([Role.SUPER_ADMIN]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ur.organization_id IS NULL',
      );
    });

    it('should return empty array when user has no roles', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await repository.getRolesByOrganization(
        userId,
        organizationId,
      );

      expect(result).toEqual([]);
    });

    it('should handle SUPER_ADMIN system role correctly', async () => {
      const userId = 'super-admin-user';

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { roleName: 'super_admin' },
      ]);

      const result = await repository.getRolesByOrganization(userId);

      expect(result).toContain(Role.SUPER_ADMIN);
    });
  });

  describe('findByRoles', () => {
    it('should find users by roles in an organization', async () => {
      const organizationId = 'org-456';
      const roles = [Role.ADMIN, Role.GESTOR];

      const mockSchemas = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          firstName: 'Admin',
          preferences: {
            language: 'en',
            theme: 'light',
            notifications: true,
            timezone: 'UTC',
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'manager@example.com',
          firstName: 'Manager',
          preferences: {
            language: 'en',
            theme: 'light',
            notifications: true,
            timezone: 'UTC',
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as UserSchema[];

      mockQueryBuilder.getMany.mockResolvedValue(mockSchemas);

      const result = await repository.findByRoles(organizationId, roles);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(UserEntity);
      expect(result[1]).toBeInstanceOf(UserEntity);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'user_roles',
        'ur',
        'ur.user_id = users.id',
      );
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'roles',
        'r',
        'r.id = ur.role_id',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ur.organization_id = :organizationId',
        { organizationId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'r.name IN (:...roles)',
        { roles },
      );
    });

    it('should return empty array when no users have the specified roles', async () => {
      const organizationId = 'org-456';
      const roles = [Role.ADMIN];

      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await repository.findByRoles(organizationId, roles);

      expect(result).toEqual([]);
    });
  });
});
