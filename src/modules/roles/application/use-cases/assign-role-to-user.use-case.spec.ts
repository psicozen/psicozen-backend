import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AssignRoleToUserUseCase } from './assign-role-to-user.use-case';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';
import {
  IRoleRepository,
  ROLE_REPOSITORY,
} from '../../domain/repositories/role.repository.interface';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../../../organizations/domain/repositories/organization.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { RoleEntity } from '../../domain/entities/role.entity';
import { OrganizationEntity } from '../../../organizations/domain/entities/organization.entity';
import { Role } from '../../domain/enums/role.enum';
import { AssignRoleDto } from '../dtos/assign-role.dto';

describe('AssignRoleToUserUseCase', () => {
  let useCase: AssignRoleToUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let roleRepository: jest.Mocked<IRoleRepository>;
  let organizationRepository: jest.Mocked<IOrganizationRepository>;

  // Mock entities
  const mockUser = new UserEntity({
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
  });

  const mockRole = new RoleEntity({
    id: 'role-456',
    name: Role.ADMIN,
    description: 'Administrator role',
  });

  const mockOrganization = new OrganizationEntity({
    id: 'org-789',
    name: 'Test Organization',
    slug: 'test-org',
  });

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      getRolesByOrganization: jest.fn(),
    };

    const mockRoleRepository = {
      findByName: jest.fn(),
      assignRoleToUser: jest.fn(),
    };

    const mockOrganizationRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignRoleToUserUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: ROLE_REPOSITORY,
          useValue: mockRoleRepository,
        },
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    useCase = module.get<AssignRoleToUserUseCase>(AssignRoleToUserUseCase);
    userRepository = module.get(USER_REPOSITORY);
    roleRepository = module.get(ROLE_REPOSITORY);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute - Success Cases', () => {
    it('should assign role to user successfully with organization', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.ADMIN,
        organizationId: 'org-789',
      };
      const assignedBy = 'admin-001';

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(mockRole);
      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.getRolesByOrganization.mockResolvedValue([]);
      roleRepository.assignRoleToUser.mockResolvedValue(undefined);

      await useCase.execute(dto, assignedBy);

      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(roleRepository.findByName).toHaveBeenCalledWith(Role.ADMIN);
      expect(organizationRepository.findById).toHaveBeenCalledWith('org-789');
      expect(userRepository.getRolesByOrganization).toHaveBeenCalledWith(
        'user-123',
        'org-789',
      );
      expect(roleRepository.assignRoleToUser).toHaveBeenCalledWith({
        userId: 'user-123',
        roleId: 'role-456',
        organizationId: 'org-789',
        assignedBy: 'admin-001',
      });
    });

    it('should assign SUPER_ADMIN role without organization (global role)', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.SUPER_ADMIN,
      };
      const assignedBy = 'admin-001';

      const superAdminRole = new RoleEntity({
        id: 'role-super',
        name: Role.SUPER_ADMIN,
        description: 'Super Administrator',
      });

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(superAdminRole);
      userRepository.getRolesByOrganization.mockResolvedValue([]);
      roleRepository.assignRoleToUser.mockResolvedValue(undefined);

      await useCase.execute(dto, assignedBy);

      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(roleRepository.findByName).toHaveBeenCalledWith(Role.SUPER_ADMIN);
      expect(organizationRepository.findById).not.toHaveBeenCalled(); // Não deve validar org
      expect(roleRepository.assignRoleToUser).toHaveBeenCalledWith({
        userId: 'user-123',
        roleId: 'role-super',
        organizationId: undefined,
        assignedBy: 'admin-001',
      });
    });
  });

  describe('execute - Validation Errors', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      const dto: AssignRoleDto = {
        userId: 'nonexistent-user',
        roleName: Role.ADMIN,
        organizationId: 'org-789',
      };

      userRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        'Usuário com ID nonexistent-user não encontrado',
      );

      expect(roleRepository.findByName).not.toHaveBeenCalled();
      expect(roleRepository.assignRoleToUser).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when role does not exist', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: 'invalid_role' as Role,
        organizationId: 'org-789',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(null);

      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        'Papel invalid_role não encontrado',
      );

      expect(organizationRepository.findById).not.toHaveBeenCalled();
      expect(roleRepository.assignRoleToUser).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when non-global role has no organizationId', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.ADMIN, // ADMIN não é global
      };

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(mockRole);

      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        `Papel ${Role.ADMIN} requer ID de organização. Apenas ${Role.SUPER_ADMIN} é um papel global.`,
      );

      expect(organizationRepository.findById).not.toHaveBeenCalled();
      expect(roleRepository.assignRoleToUser).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.ADMIN,
        organizationId: 'nonexistent-org',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(mockRole);
      organizationRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        'Organização com ID nonexistent-org não encontrada',
      );

      expect(roleRepository.assignRoleToUser).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user already has role in organization', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.ADMIN,
        organizationId: 'org-789',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(mockRole);
      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.getRolesByOrganization.mockResolvedValue([Role.ADMIN]); // Já tem o papel

      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        ConflictException,
      );
      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        `Usuário já possui o papel ${Role.ADMIN} na organização org-789`,
      );

      expect(roleRepository.assignRoleToUser).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for global role duplication', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.SUPER_ADMIN,
      };

      const superAdminRole = new RoleEntity({
        id: 'role-super',
        name: Role.SUPER_ADMIN,
        description: 'Super Administrator',
      });

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(superAdminRole);
      userRepository.getRolesByOrganization.mockResolvedValue([
        Role.SUPER_ADMIN,
      ]);

      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        ConflictException,
      );
      await expect(useCase.execute(dto, 'admin-001')).rejects.toThrow(
        `Usuário já possui o papel ${Role.SUPER_ADMIN} globalmente`,
      );

      expect(roleRepository.assignRoleToUser).not.toHaveBeenCalled();
    });
  });

  describe('execute - Edge Cases', () => {
    it('should handle GESTOR role assignment', async () => {
      const gestorRole = new RoleEntity({
        id: 'role-gestor',
        name: Role.GESTOR,
        description: 'Manager role',
      });

      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.GESTOR,
        organizationId: 'org-789',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(gestorRole);
      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.getRolesByOrganization.mockResolvedValue([]);
      roleRepository.assignRoleToUser.mockResolvedValue(undefined);

      await useCase.execute(dto, 'admin-001');

      expect(roleRepository.assignRoleToUser).toHaveBeenCalledWith({
        userId: 'user-123',
        roleId: 'role-gestor',
        organizationId: 'org-789',
        assignedBy: 'admin-001',
      });
    });

    it('should handle COLABORADOR role assignment', async () => {
      const colaboradorRole = new RoleEntity({
        id: 'role-colab',
        name: Role.COLABORADOR,
        description: 'Employee role',
      });

      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.COLABORADOR,
        organizationId: 'org-789',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(colaboradorRole);
      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.getRolesByOrganization.mockResolvedValue([]);
      roleRepository.assignRoleToUser.mockResolvedValue(undefined);

      await useCase.execute(dto, 'admin-001');

      expect(roleRepository.assignRoleToUser).toHaveBeenCalledWith({
        userId: 'user-123',
        roleId: 'role-colab',
        organizationId: 'org-789',
        assignedBy: 'admin-001',
      });
    });

    it('should allow user to have different roles in different organizations', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-123',
        roleName: Role.ADMIN,
        organizationId: 'org-789',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      roleRepository.findByName.mockResolvedValue(mockRole);
      organizationRepository.findById.mockResolvedValue(mockOrganization);
      // Usuário tem GESTOR em outra org, mas não ADMIN nesta org
      userRepository.getRolesByOrganization.mockResolvedValue([Role.GESTOR]);
      roleRepository.assignRoleToUser.mockResolvedValue(undefined);

      await useCase.execute(dto, 'admin-001');

      expect(roleRepository.assignRoleToUser).toHaveBeenCalled();
    });
  });
});
