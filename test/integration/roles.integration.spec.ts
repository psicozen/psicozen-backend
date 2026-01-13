import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { RoleRepository } from '../../src/modules/roles/infrastructure/repositories/role.repository';
import { UserRepository } from '../../src/modules/users/infrastructure/repositories/user.repository';
import { OrganizationRepository } from '../../src/modules/organizations/infrastructure/repositories/organization.repository';
import { RoleSchema } from '../../src/modules/roles/infrastructure/persistence/role.schema';
import { UserSchema } from '../../src/modules/users/infrastructure/persistence/user.schema';
import { UserRoleSchema } from '../../src/modules/roles/infrastructure/persistence/user-role.schema';
import { OrganizationSchema } from '../../src/modules/organizations/infrastructure/persistence/organization.schema';
import { Role } from '../../src/modules/roles/domain/enums/role.enum';
import {
  initializeTestDatabase,
  clearDatabase,
  closeDatabase,
  getTestDataSource,
} from '../utils/test-database.helper';
import {
  createUserFixture,
  createUsersForRoleTesting,
} from '../fixtures/user.fixtures';
import {
  createDefaultRoles,
  createRoleByName,
} from '../fixtures/role.fixtures';
import {
  createCompanyFixture,
  createDepartmentFixture,
} from '../fixtures/organization.fixtures';

describe('Role Assignment Integration Tests', () => {
  let roleRepository: RoleRepository;
  let userRepository: UserRepository;
  let orgRepository: OrganizationRepository;
  let typeormRoleRepository: Repository<RoleSchema>;
  let typeormUserRepository: Repository<UserSchema>;
  let typeormUserRoleRepository: Repository<UserRoleSchema>;
  let typeormOrgRepository: Repository<OrganizationSchema>;

  // Shared roles created once and reused across tests
  let savedRoles: {
    superAdmin: RoleSchema;
    admin: RoleSchema;
    gestor: RoleSchema;
    colaborador: RoleSchema;
  };

  beforeAll(async () => {
    await initializeTestDatabase();
    const dataSource = getTestDataSource();

    // Get TypeORM repositories
    typeormRoleRepository = dataSource.getRepository(RoleSchema);
    typeormUserRepository = dataSource.getRepository(UserSchema);
    typeormUserRoleRepository = dataSource.getRepository(UserRoleSchema);
    typeormOrgRepository = dataSource.getRepository(OrganizationSchema);

    // Initialize application repositories
    roleRepository = new RoleRepository(
      typeormRoleRepository,
      typeormUserRoleRepository,
    );
    userRepository = new UserRepository(typeormUserRepository);
    orgRepository = new OrganizationRepository(typeormOrgRepository);

    // Create roles once and reuse them
    const roles = createDefaultRoles();
    savedRoles = {
      superAdmin: await typeormRoleRepository.save(roles.superAdmin),
      admin: await typeormRoleRepository.save(roles.admin),
      gestor: await typeormRoleRepository.save(roles.gestor),
      colaborador: await typeormRoleRepository.save(roles.colaborador),
    };
  });

  afterEach(async () => {
    // Clear only user_roles, users, and organizations - keep roles
    await typeormUserRoleRepository.clear();
    await typeormUserRepository.clear();
    await typeormOrgRepository.clear();
  });

  afterAll(async () => {
    await clearDatabase();
    await closeDatabase();
  });

  describe('Multi-Organization Role Assignment', () => {
    it('should assign ADMIN role to user in organization A', async () => {
      // Given: User, ADMIN role, Organization A
      const userFixture = createUserFixture({ email: 'admin@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      // When: Assign ADMIN to user in Org A
      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // Then: User has ADMIN in Org A
      const hasRole = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.admin.id,
        savedOrgA.id,
      );
      expect(hasRole).toBe(true);

      // User does NOT have ADMIN globally (without organization)
      const hasGlobalRole = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.admin.id,
        null,
      );
      expect(hasGlobalRole).toBe(false);

      // Verify through user repository
      const rolesInOrgA = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgA.id,
      );
      expect(rolesInOrgA).toContain(Role.ADMIN);
      expect(rolesInOrgA).toHaveLength(1);
    });

    it('should assign GESTOR role to same user in organization B', async () => {
      // Given: User with ADMIN in Org A
      const userFixture = createUserFixture({ email: 'multiorg@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      const orgB = createCompanyFixture({ name: 'Organization B' });
      const savedOrgB = await typeormOrgRepository.save(orgB);

      // Assign ADMIN in Org A
      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // When: Assign GESTOR to user in Org B
      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.gestor.id,
        organizationId: savedOrgB.id,
        assignedBy: savedUser.id,
      });

      // Then: User has ADMIN in Org A (unchanged)
      const rolesInOrgA = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgA.id,
      );
      expect(rolesInOrgA).toContain(Role.ADMIN);
      expect(rolesInOrgA).not.toContain(Role.GESTOR);

      // User has GESTOR in Org B
      const rolesInOrgB = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgB.id,
      );
      expect(rolesInOrgB).toContain(Role.GESTOR);
      expect(rolesInOrgB).not.toContain(Role.ADMIN);
    });

    it('should allow different roles in different organizations', async () => {
      // Given: User with ADMIN in Org A and GESTOR in Org B
      const userFixture = createUserFixture({ email: 'diffroles@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Company A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      const orgB = createCompanyFixture({ name: 'Company B' });
      const savedOrgB = await typeormOrgRepository.save(orgB);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.gestor.id,
        organizationId: savedOrgB.id,
        assignedBy: savedUser.id,
      });

      // When: Query roles by organization
      const rolesInOrgA = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgA.id,
      );
      const rolesInOrgB = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgB.id,
      );

      // Then: getRolesByOrganization returns correct roles for each org
      expect(rolesInOrgA).toEqual([Role.ADMIN]);
      expect(rolesInOrgB).toEqual([Role.GESTOR]);
    });

    it('should allow same user multiple roles in same organization', async () => {
      // Given: User with ADMIN in Org A
      const userFixture = createUserFixture({ email: 'multiroles@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // When: Assign GESTOR to same user in same Org A
      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.gestor.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // Then: User has both ADMIN and GESTOR in Org A
      const rolesInOrgA = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgA.id,
      );
      expect(rolesInOrgA).toContain(Role.ADMIN);
      expect(rolesInOrgA).toContain(Role.GESTOR);
      expect(rolesInOrgA).toHaveLength(2);
    });
  });

  describe('Global Role Assignment (SUPER_ADMIN)', () => {
    it('should assign SUPER_ADMIN globally without organization', async () => {
      // Given: User, SUPER_ADMIN role
      const userFixture = createUserFixture({ email: 'superadmin@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      // When: Assign SUPER_ADMIN without organizationId (global)
      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.superAdmin.id,
        organizationId: null,
        assignedBy: savedUser.id,
      });

      // Then: User has SUPER_ADMIN globally
      const hasGlobalRole = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.superAdmin.id,
        null,
      );
      expect(hasGlobalRole).toBe(true);

      // getRolesByOrganization with null returns global roles
      const globalRoles = await userRepository.getRolesByOrganization(
        savedUser.id,
        null,
      );
      expect(globalRoles).toContain(Role.SUPER_ADMIN);
    });

    it('should include SUPER_ADMIN in any organization query', async () => {
      // Given: User with SUPER_ADMIN globally
      const userFixture = createUserFixture({ email: 'globaladmin@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.superAdmin.id,
        organizationId: null,
        assignedBy: savedUser.id,
      });

      // When: Query roles for specific organization
      const rolesInOrgA = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgA.id,
      );

      // Then: SUPER_ADMIN is included (global roles apply everywhere)
      expect(rolesInOrgA).toContain(Role.SUPER_ADMIN);
    });

    it('should allow SUPER_ADMIN to coexist with org-specific roles', async () => {
      // Given: User with SUPER_ADMIN globally
      const userFixture = createUserFixture({ email: 'coexist@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.superAdmin.id,
        organizationId: null,
        assignedBy: savedUser.id,
      });

      // When: Assign ADMIN in Org A
      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // Then: User has both roles in Org A context
      const rolesInOrgA = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgA.id,
      );
      expect(rolesInOrgA).toContain(Role.SUPER_ADMIN);
      expect(rolesInOrgA).toContain(Role.ADMIN);
      expect(rolesInOrgA).toHaveLength(2);

      // Global context only has SUPER_ADMIN
      const globalRoles = await userRepository.getRolesByOrganization(
        savedUser.id,
        null,
      );
      expect(globalRoles).toEqual([Role.SUPER_ADMIN]);
    });
  });

  describe('Duplicate Role Assignment Prevention', () => {
    it('should prevent duplicate role assignment in same organization', async () => {
      // Given: User already has ADMIN in Org A
      const userFixture = createUserFixture({ email: 'duplicate@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // When: Try to assign ADMIN again in same Org A
      // Then: Should throw ConflictException
      await expect(
        roleRepository.assignRoleToUser({
          userId: savedUser.id,
          roleId: savedRoles.admin.id,
          organizationId: savedOrgA.id,
          assignedBy: savedUser.id,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should prevent duplicate global role assignment', async () => {
      // Given: User already has SUPER_ADMIN globally
      const userFixture = createUserFixture({
        email: 'duplicateglobal@test.com',
      });
      const savedUser = await typeormUserRepository.save(userFixture);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.superAdmin.id,
        organizationId: null,
        assignedBy: savedUser.id,
      });

      // When: Try to assign SUPER_ADMIN again globally
      // Then: Should throw ConflictException
      await expect(
        roleRepository.assignRoleToUser({
          userId: savedUser.id,
          roleId: savedRoles.superAdmin.id,
          organizationId: null,
          assignedBy: savedUser.id,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same role in different organizations', async () => {
      // Given: User has ADMIN in Org A
      const userFixture = createUserFixture({ email: 'difforg@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      const orgB = createCompanyFixture({ name: 'Organization B' });
      const savedOrgB = await typeormOrgRepository.save(orgB);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // When: Assign same ADMIN role in Org B
      // Then: Should succeed (different organizations)
      await expect(
        roleRepository.assignRoleToUser({
          userId: savedUser.id,
          roleId: savedRoles.admin.id,
          organizationId: savedOrgB.id,
          assignedBy: savedUser.id,
        }),
      ).resolves.not.toThrow();

      // Verify both assignments exist
      const rolesInOrgA = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgA.id,
      );
      const rolesInOrgB = await userRepository.getRolesByOrganization(
        savedUser.id,
        savedOrgB.id,
      );

      expect(rolesInOrgA).toContain(Role.ADMIN);
      expect(rolesInOrgB).toContain(Role.ADMIN);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique constraint on [userId, roleId, organizationId]', async () => {
      // Given: User with role in organization
      const userFixture = createUserFixture({ email: 'constraint@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      // Create first assignment
      const userRole1 = new UserRoleSchema();
      userRole1.userId = savedUser.id;
      userRole1.roleId = savedRoles.admin.id;
      userRole1.organizationId = savedOrgA.id;
      userRole1.assignedBy = savedUser.id;
      await typeormUserRoleRepository.save(userRole1);

      // When: Try to insert duplicate directly in database
      const userRole2 = new UserRoleSchema();
      userRole2.userId = savedUser.id;
      userRole2.roleId = savedRoles.admin.id;
      userRole2.organizationId = savedOrgA.id;
      userRole2.assignedBy = savedUser.id;

      // Then: Should throw constraint violation error
      await expect(typeormUserRoleRepository.save(userRole2)).rejects.toThrow();
    });

    it('should cascade delete user_roles when organization is deleted', async () => {
      // Given: User with role in organization
      const userFixture = createUserFixture({ email: 'cascade@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization To Delete' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // Verify assignment exists
      const beforeDelete = await typeormUserRoleRepository.count({
        where: {
          userId: savedUser.id,
          roleId: savedRoles.admin.id,
          organizationId: savedOrgA.id,
        },
      });
      expect(beforeDelete).toBe(1);

      // When: Delete organization
      await typeormOrgRepository.delete(savedOrgA.id);

      // Then: user_roles entry should also be deleted (CASCADE)
      const afterDelete = await typeormUserRoleRepository.count({
        where: {
          userId: savedUser.id,
          roleId: savedRoles.admin.id,
          organizationId: savedOrgA.id,
        },
      });
      expect(afterDelete).toBe(0);
    });

    it('should handle NULL organizationId in unique constraint', async () => {
      // Given: User and role
      const userFixture = createUserFixture({ email: 'nullorg@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      // When: Assign same role with NULL and with organization
      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: null,
        assignedBy: savedUser.id,
      });

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // Then: Both assignments should coexist (NULL is distinct in unique index)
      const globalHasRole = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.admin.id,
        null,
      );
      const orgHasRole = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.admin.id,
        savedOrgA.id,
      );

      expect(globalHasRole).toBe(true);
      expect(orgHasRole).toBe(true);

      // Verify count
      const count = await typeormUserRoleRepository.count({
        where: { userId: savedUser.id, roleId: savedRoles.admin.id },
      });
      expect(count).toBe(2);
    });
  });

  describe('Repository Method Validation', () => {
    it('userHasRoleInOrganization should work for org-scoped roles', async () => {
      // Given: User with role in specific organization
      const userFixture = createUserFixture({ email: 'methodtest@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.gestor.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      // When: Check if user has role in organization
      const hasRole = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.gestor.id,
        savedOrgA.id,
      );

      // Then: Should return true
      expect(hasRole).toBe(true);

      // Should return false for different organization
      const orgB = createCompanyFixture({ name: 'Organization B' });
      const savedOrgB = await typeormOrgRepository.save(orgB);

      const hasRoleInOrgB = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.gestor.id,
        savedOrgB.id,
      );
      expect(hasRoleInOrgB).toBe(false);
    });

    it('userHasRoleInOrganization should work for global roles', async () => {
      // Given: User with global role
      const userFixture = createUserFixture({ email: 'globalmethod@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.superAdmin.id,
        organizationId: null,
        assignedBy: savedUser.id,
      });

      // When: Check if user has global role
      const hasGlobalRole = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.superAdmin.id,
        null,
      );

      // Then: Should return true
      expect(hasGlobalRole).toBe(true);
    });

    it('removeRoleFromUser should remove org-specific role without affecting others', async () => {
      // Given: User with same role in two organizations
      const userFixture = createUserFixture({ email: 'removetest@test.com' });
      const savedUser = await typeormUserRepository.save(userFixture);

      const orgA = createCompanyFixture({ name: 'Organization A' });
      const savedOrgA = await typeormOrgRepository.save(orgA);

      const orgB = createCompanyFixture({ name: 'Organization B' });
      const savedOrgB = await typeormOrgRepository.save(orgB);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgA.id,
        assignedBy: savedUser.id,
      });

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.admin.id,
        organizationId: savedOrgB.id,
        assignedBy: savedUser.id,
      });

      // When: Remove role from Org A only
      await roleRepository.removeRoleFromUser(
        savedUser.id,
        savedRoles.admin.id,
        savedOrgA.id,
      );

      // Then: Role removed from Org A
      const hasRoleInOrgA = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.admin.id,
        savedOrgA.id,
      );
      expect(hasRoleInOrgA).toBe(false);

      // Role still exists in Org B
      const hasRoleInOrgB = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.admin.id,
        savedOrgB.id,
      );
      expect(hasRoleInOrgB).toBe(true);
    });

    it('removeRoleFromUser should handle global role removal', async () => {
      // Given: User with global role
      const userFixture = createUserFixture({
        email: 'removeglobal@test.com',
      });
      const savedUser = await typeormUserRepository.save(userFixture);

      await roleRepository.assignRoleToUser({
        userId: savedUser.id,
        roleId: savedRoles.superAdmin.id,
        organizationId: null,
        assignedBy: savedUser.id,
      });

      // Verify role exists
      const beforeRemove = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.superAdmin.id,
        null,
      );
      expect(beforeRemove).toBe(true);

      // When: Remove global role
      await roleRepository.removeRoleFromUser(
        savedUser.id,
        savedRoles.superAdmin.id,
        null,
      );

      // Then: Global role removed
      const afterRemove = await roleRepository.userHasRoleInOrganization(
        savedUser.id,
        savedRoles.superAdmin.id,
        null,
      );
      expect(afterRemove).toBe(false);
    });
  });
});
