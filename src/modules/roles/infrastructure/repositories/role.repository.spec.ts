import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { RoleRepository } from './role.repository';
import { RoleSchema } from '../persistence/role.schema';
import { UserRoleSchema } from '../persistence/user-role.schema';
import { RoleEntity } from '../../domain/entities/role.entity';

describe('RoleRepository', () => {
  let repository: RoleRepository;
  let roleRepository: jest.Mocked<Repository<RoleSchema>>;
  let userRoleRepository: jest.Mocked<Repository<UserRoleSchema>>;

  beforeEach(async () => {
    const mockRoleRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findAndCount: jest.fn(),
    };

    const mockUserRoleRepository = {
      count: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleRepository,
        {
          provide: getRepositoryToken(RoleSchema),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(UserRoleSchema),
          useValue: mockUserRoleRepository,
        },
      ],
    }).compile();

    repository = module.get<RoleRepository>(RoleRepository);
    roleRepository = module.get(getRepositoryToken(RoleSchema));
    userRoleRepository = module.get(getRepositoryToken(UserRoleSchema));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('toDomain', () => {
    it('should map RoleSchema to RoleEntity', () => {
      const schema = new RoleSchema();
      schema.id = 'role-123';
      schema.name = 'admin';
      schema.description = 'Administrator role';
      schema.createdAt = new Date();
      schema.updatedAt = new Date();

      const entity = repository.toDomain(schema);

      expect(entity).toBeInstanceOf(RoleEntity);
      expect(entity.id).toBe('role-123');
      expect(entity.name).toBe('admin');
      expect(entity.description).toBe('Administrator role');
    });
  });

  describe('toEntity', () => {
    it('should map RoleEntity to RoleSchema', () => {
      const entity = new RoleEntity({
        id: 'role-123',
        name: 'admin',
        description: 'Administrator role',
      });

      const schema = repository.toEntity(entity);

      expect(schema).toBeInstanceOf(RoleSchema);
      expect(schema.id).toBe('role-123');
      expect(schema.name).toBe('admin');
      expect(schema.description).toBe('Administrator role');
    });

    it('should handle partial RoleEntity without id', () => {
      const entity: Partial<RoleEntity> = {
        name: 'admin',
        description: 'Administrator role',
      };

      const schema = repository.toEntity(entity);

      expect(schema).toBeInstanceOf(RoleSchema);
      expect(schema.id).toBeUndefined();
      expect(schema.name).toBe('admin');
    });
  });

  describe('findByName', () => {
    it('should return RoleEntity when role exists', async () => {
      const mockSchema = new RoleSchema();
      mockSchema.id = 'role-123';
      mockSchema.name = 'admin';
      mockSchema.description = 'Administrator';
      mockSchema.createdAt = new Date();
      mockSchema.updatedAt = new Date();

      roleRepository.findOne.mockResolvedValue(mockSchema);

      const result = await repository.findByName('admin');

      expect(result).toBeInstanceOf(RoleEntity);
      expect(result?.name).toBe('admin');
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'admin' },
      });
    });

    it('should return null when role does not exist', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByName('nonexistent');

      expect(result).toBeNull();
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'nonexistent' },
      });
    });
  });

  describe('assignRoleToUser', () => {
    const assignData = {
      userId: 'user-123',
      roleId: 'role-456',
      organizationId: 'org-789',
      assignedBy: 'admin-001',
    };

    it('should assign role to user successfully', async () => {
      userRoleRepository.count.mockResolvedValue(0); // Não existe
      userRoleRepository.save.mockResolvedValue({} as UserRoleSchema);

      await repository.assignRoleToUser(assignData);

      expect(userRoleRepository.count).toHaveBeenCalledWith({
        where: {
          userId: assignData.userId,
          roleId: assignData.roleId,
          organizationId: assignData.organizationId,
        },
      });
      expect(userRoleRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already has role', async () => {
      userRoleRepository.count.mockResolvedValue(1); // Já existe

      await expect(repository.assignRoleToUser(assignData)).rejects.toThrow(
        ConflictException,
      );
      await expect(repository.assignRoleToUser(assignData)).rejects.toThrow(
        'Usuário já possui este papel nesta organização',
      );
      expect(userRoleRepository.save).not.toHaveBeenCalled();
    });

    it('should handle global role assignment (no organizationId)', async () => {
      const globalData = {
        userId: 'user-123',
        roleId: 'role-456',
        assignedBy: 'admin-001',
      };

      userRoleRepository.count.mockResolvedValue(0);
      userRoleRepository.save.mockResolvedValue({} as UserRoleSchema);

      await repository.assignRoleToUser(globalData);

      expect(userRoleRepository.count).toHaveBeenCalledWith({
        where: {
          userId: globalData.userId,
          roleId: globalData.roleId,
          organizationId: null,
        },
      });
    });

    it('should handle unique constraint violation from database', async () => {
      userRoleRepository.count.mockResolvedValue(0);
      userRoleRepository.save.mockRejectedValue({ code: '23505' }); // PostgreSQL unique violation

      await expect(repository.assignRoleToUser(assignData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rethrow non-constraint errors', async () => {
      userRoleRepository.count.mockResolvedValue(0);
      const dbError = new Error('Database connection failed');
      userRoleRepository.save.mockRejectedValue(dbError);

      await expect(repository.assignRoleToUser(assignData)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('userHasRoleInOrganization', () => {
    it('should return true when user has role in organization', async () => {
      userRoleRepository.count.mockResolvedValue(1);

      const result = await repository.userHasRoleInOrganization(
        'user-123',
        'role-456',
        'org-789',
      );

      expect(result).toBe(true);
      expect(userRoleRepository.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          roleId: 'role-456',
          organizationId: 'org-789',
        },
      });
    });

    it('should return false when user does not have role', async () => {
      userRoleRepository.count.mockResolvedValue(0);

      const result = await repository.userHasRoleInOrganization(
        'user-123',
        'role-456',
        'org-789',
      );

      expect(result).toBe(false);
    });

    it('should handle global role check (no organizationId)', async () => {
      userRoleRepository.count.mockResolvedValue(1);

      const result = await repository.userHasRoleInOrganization(
        'user-123',
        'role-456',
      );

      expect(result).toBe(true);
      expect(userRoleRepository.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          roleId: 'role-456',
          organizationId: null,
        },
      });
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove role from user in organization', async () => {
      userRoleRepository.delete.mockResolvedValue({} as any);

      await repository.removeRoleFromUser('user-123', 'role-456', 'org-789');

      expect(userRoleRepository.delete).toHaveBeenCalledWith({
        userId: 'user-123',
        roleId: 'role-456',
        organizationId: 'org-789',
      });
    });

    it('should remove global role (no organizationId)', async () => {
      userRoleRepository.delete.mockResolvedValue({} as any);

      await repository.removeRoleFromUser('user-123', 'role-456');

      expect(userRoleRepository.delete).toHaveBeenCalledWith({
        userId: 'user-123',
        roleId: 'role-456',
        organizationId: null,
      });
    });
  });
});
