import {
  INestApplication,
  Controller,
  Get,
  UseGuards,
  Module,
  ExecutionContext,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';

// Schemas
import { UserSchema } from '../src/modules/users/infrastructure/persistence/user.schema';
import { RoleSchema } from '../src/modules/roles/infrastructure/persistence/role.schema';
import { PermissionSchema } from '../src/modules/roles/infrastructure/persistence/permission.schema';
import { UserRoleSchema } from '../src/modules/roles/infrastructure/persistence/user-role.schema';
import { OrganizationSchema } from '../src/modules/organizations/infrastructure/persistence/organization.schema';

// Guards and decorators
import { JwtAuthGuard } from '../src/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../src/core/presentation/guards/roles.guard';
import { Roles } from '../src/core/presentation/decorators/roles.decorator';
import { CurrentUser } from '../src/core/presentation/decorators/current-user.decorator';

// Domain
import { Role } from '../src/modules/roles/domain/enums/role.enum';
import { USER_REPOSITORY } from '../src/modules/users/domain/repositories/user.repository.interface';
import { UserRepository } from '../src/modules/users/infrastructure/repositories/user.repository';

// Fixtures
import { createUserFixture } from './fixtures/user.fixtures';
import { createDefaultRoles } from './fixtures/role.fixtures';
import { createCompanyFixture } from './fixtures/organization.fixtures';

// Test Database Utilities
import { testDataSourceOptions } from './config/test-datasource';
import {
  initializeTestDatabase,
  clearDatabase,
  closeDatabase,
  runAsServiceRole,
} from './utils/test-database.helper';
import { resetAllFixtures } from './utils/reset-fixtures.helper';

/**
 * E2E Tests for RBAC (Role-Based Access Control)
 *
 * Uses PostgreSQL staging database (Render) for realistic testing.
 * Tests the authorization system with multi-organization support:
 * - Role-based endpoint access
 * - Organization isolation (users can only access their org's data)
 * - Role hierarchy (SUPER_ADMIN > ADMIN > GESTOR > COLABORADOR)
 * - 403 Forbidden responses for unauthorized access
 */

// Test controller with role-protected endpoints
@Controller('test-rbac')
class TestRBACController {
  @Get('super-admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  superAdminOnly(@CurrentUser('id') userId: string) {
    return { message: 'Super admin access granted', userId };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminOnly(@CurrentUser('id') userId: string) {
    return { message: 'Admin access granted', userId };
  }

  @Get('gestor-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GESTOR)
  gestorOnly(@CurrentUser('id') userId: string) {
    return { message: 'Gestor access granted', userId };
  }

  @Get('colaborador-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COLABORADOR)
  colaboradorOnly(@CurrentUser('id') userId: string) {
    return { message: 'Colaborador access granted', userId };
  }

  @Get('public')
  publicEndpoint() {
    return { message: 'Public access - no auth required' };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([UserSchema])],
  controllers: [TestRBACController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
})
class TestRBACModule {}

// Test user type
interface TestUser {
  id: string;
  email: string;
}

// Response body types
interface RoleEndpointResponse {
  message: string;
  userId?: string;
}

interface PublicEndpointResponse {
  message: string;
}

describe('RBAC Authorization (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userRepository: Repository<UserSchema>;
  let roleRepository: Repository<RoleSchema>;
  let userRoleRepository: Repository<UserRoleSchema>;
  let orgRepository: Repository<OrganizationSchema>;

  // Saved entities for reuse
  let savedRoles: {
    superAdmin: RoleSchema;
    admin: RoleSchema;
    gestor: RoleSchema;
    colaborador: RoleSchema;
  };

  let org1: OrganizationSchema;
  let org2: OrganizationSchema;

  let users: {
    superAdmin: UserSchema;
    adminOrg1: UserSchema;
    gestorOrg1: UserSchema;
    colaboradorOrg1: UserSchema;
    adminOrg2: UserSchema;
    gestorOrg2: UserSchema;
  };

  // Current test user for guard mock
  let currentTestUser: TestUser | null = null;

  beforeAll(async () => {
    // Initialize PostgreSQL test database
    await initializeTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // PostgreSQL staging database (Render)
        TypeOrmModule.forRoot(testDataSourceOptions),
        TypeOrmModule.forFeature([
          UserSchema,
          RoleSchema,
          UserRoleSchema,
          OrganizationSchema,
        ]),
        TestRBACModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          if (!currentTestUser) return false;
          const req = context.switchToHttp().getRequest<{
            user?: TestUser;
          }>();
          req.user = currentTestUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    userRepository = dataSource.getRepository(UserSchema);
    roleRepository = dataSource.getRepository(RoleSchema);
    userRoleRepository = dataSource.getRepository(UserRoleSchema);
    orgRepository = dataSource.getRepository(OrganizationSchema);

    // Fetch existing system roles (created by migrations)
    // Do not create new roles - they already exist as seed data
    const superAdminRole = await roleRepository.findOne({
      where: { name: Role.SUPER_ADMIN },
    });
    const adminRole = await roleRepository.findOne({
      where: { name: Role.ADMIN },
    });
    const gestorRole = await roleRepository.findOne({
      where: { name: Role.GESTOR },
    });
    const colaboradorRole = await roleRepository.findOne({
      where: { name: Role.COLABORADOR },
    });

    if (!superAdminRole || !adminRole || !gestorRole || !colaboradorRole) {
      throw new Error(
        'System roles not found in database. Run migrations first: npm run test:migrate',
      );
    }

    savedRoles = {
      superAdmin: superAdminRole,
      admin: adminRole,
      gestor: gestorRole,
      colaborador: colaboradorRole,
    };

    // Note: Test data (organizations, users, user_roles) are now created
    // in beforeEach to ensure test isolation. Only system roles are loaded here.
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    // Reset fixture counters to prevent conflicts across multiple test runs
    resetAllFixtures();
    // Clear test data using the helper (preserves seed roles)
    await clearDatabase();

    // Then create fixtures in service role context
    const testData = await runAsServiceRole(async () => {
      // Get repositories from transaction manager to use RLS context
      const { getTransactionManager } = await import(
        '../src/core/infrastructure/database/rls.storage'
      );
      const transactionManager = getTransactionManager();

      if (!transactionManager) {
        throw new Error(
          'Transaction manager not available in runAsServiceRole context',
        );
      }

      const txOrgRepo = transactionManager.getRepository(OrganizationSchema);
      const txUserRepo = transactionManager.getRepository(UserSchema);
      const txUserRoleRepo = transactionManager.getRepository(UserRoleSchema);

      // Recreate test data
      // Create organizations
      const org1Fixture = createCompanyFixture({ name: 'Organization 1' });
      const org2Fixture = createCompanyFixture({ name: 'Organization 2' });
      const org1 = await txOrgRepo.save(org1Fixture);
      const org2 = await txOrgRepo.save(org2Fixture);

      // Create users with supabaseUserId
      const superAdminFixture = createUserFixture({
        email: 'superadmin@test.com',
        supabaseUserId: '00000002-0000-0000-0000-000000000001',
      });
      const adminOrg1Fixture = createUserFixture({
        email: 'admin1@test.com',
        supabaseUserId: '00000002-0000-0000-0000-000000000002',
      });
      const gestorOrg1Fixture = createUserFixture({
        email: 'gestor1@test.com',
        supabaseUserId: '00000002-0000-0000-0000-000000000003',
      });
      const colaboradorOrg1Fixture = createUserFixture({
        email: 'colaborador1@test.com',
        supabaseUserId: '00000002-0000-0000-0000-000000000004',
      });
      const adminOrg2Fixture = createUserFixture({
        email: 'admin2@test.com',
        supabaseUserId: '00000002-0000-0000-0000-000000000005',
      });
      const gestorOrg2Fixture = createUserFixture({
        email: 'gestor2@test.com',
        supabaseUserId: '00000002-0000-0000-0000-000000000006',
      });

      const users = {
        superAdmin: await txUserRepo.save(superAdminFixture),
        adminOrg1: await txUserRepo.save(adminOrg1Fixture),
        gestorOrg1: await txUserRepo.save(gestorOrg1Fixture),
        colaboradorOrg1: await txUserRepo.save(colaboradorOrg1Fixture),
        adminOrg2: await txUserRepo.save(adminOrg2Fixture),
        gestorOrg2: await txUserRepo.save(gestorOrg2Fixture),
      };

      // Assign roles
      // SUPER_ADMIN (global)
      await txUserRoleRepo.save({
        userId: users.superAdmin.id,
        roleId: savedRoles.superAdmin.id,
        organizationId: null,
        assignedBy: users.superAdmin.id,
      });

      // ADMIN in Org 1
      await txUserRoleRepo.save({
        userId: users.adminOrg1.id,
        roleId: savedRoles.admin.id,
        organizationId: org1.id,
        assignedBy: users.superAdmin.id,
      });

      // GESTOR in Org 1
      await txUserRoleRepo.save({
        userId: users.gestorOrg1.id,
        roleId: savedRoles.gestor.id,
        organizationId: org1.id,
        assignedBy: users.adminOrg1.id,
      });

      // COLABORADOR in Org 1
      await txUserRoleRepo.save({
        userId: users.colaboradorOrg1.id,
        roleId: savedRoles.colaborador.id,
        organizationId: org1.id,
        assignedBy: users.gestorOrg1.id,
      });

      // ADMIN in Org 2
      await txUserRoleRepo.save({
        userId: users.adminOrg2.id,
        roleId: savedRoles.admin.id,
        organizationId: org2.id,
        assignedBy: users.superAdmin.id,
      });

      // GESTOR in Org 2
      await txUserRoleRepo.save({
        userId: users.gestorOrg2.id,
        roleId: savedRoles.gestor.id,
        organizationId: org2.id,
        assignedBy: users.adminOrg2.id,
      });

      return { org1, org2, users };
    });

    // Assign to outer scope variables
    org1 = testData.org1;
    org2 = testData.org2;
    users = testData.users;
  });

  afterEach(() => {
    currentTestUser = null;
  });

  describe('Role-Based Endpoint Authorization', () => {
    it('SUPER_ADMIN can access super-admin-only endpoint', async () => {
      currentTestUser = {
        id: users.superAdmin.id,
        email: 'superadmin@test.com',
      };

      const response = await request(app.getHttpServer())
        .get('/test-rbac/super-admin-only')
        .expect(200);

      const body = response.body as RoleEndpointResponse;
      expect(body.message).toContain('Super admin access granted');
      expect(body.userId).toBe(users.superAdmin.id);
    });

    it('ADMIN can access admin-only endpoint with organization header', async () => {
      currentTestUser = { id: users.adminOrg1.id, email: 'admin1@test.com' };

      const response = await request(app.getHttpServer())
        .get('/test-rbac/admin-only')
        .set('x-organization-id', org1.id)
        .expect(200);

      const body = response.body as RoleEndpointResponse;
      expect(body.message).toContain('Admin access granted');
      expect(body.userId).toBe(users.adminOrg1.id);
    });

    it('GESTOR can access gestor-only endpoint with organization header', async () => {
      currentTestUser = { id: users.gestorOrg1.id, email: 'gestor1@test.com' };

      const response = await request(app.getHttpServer())
        .get('/test-rbac/gestor-only')
        .set('x-organization-id', org1.id)
        .expect(200);

      const body = response.body as RoleEndpointResponse;
      expect(body.message).toContain('Gestor access granted');
    });

    it('COLABORADOR can access colaborador-only endpoint with organization header', async () => {
      currentTestUser = {
        id: users.colaboradorOrg1.id,
        email: 'colaborador1@test.com',
      };

      const response = await request(app.getHttpServer())
        .get('/test-rbac/colaborador-only')
        .set('x-organization-id', org1.id)
        .expect(200);

      const body = response.body as RoleEndpointResponse;
      expect(body.message).toContain('Colaborador access granted');
    });
  });

  describe('Role Hierarchy - Higher roles can access lower role endpoints', () => {
    it('SUPER_ADMIN can access admin-only endpoint', async () => {
      currentTestUser = {
        id: users.superAdmin.id,
        email: 'superadmin@test.com',
      };

      await request(app.getHttpServer())
        .get('/test-rbac/admin-only')
        .expect(200);
    });

    it('SUPER_ADMIN can access gestor-only endpoint', async () => {
      currentTestUser = {
        id: users.superAdmin.id,
        email: 'superadmin@test.com',
      };

      await request(app.getHttpServer())
        .get('/test-rbac/gestor-only')
        .expect(200);
    });

    it('SUPER_ADMIN can access colaborador-only endpoint', async () => {
      currentTestUser = {
        id: users.superAdmin.id,
        email: 'superadmin@test.com',
      };

      await request(app.getHttpServer())
        .get('/test-rbac/colaborador-only')
        .expect(200);
    });

    it('ADMIN can access gestor-only endpoint', async () => {
      currentTestUser = { id: users.adminOrg1.id, email: 'admin1@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/gestor-only')
        .set('x-organization-id', org1.id)
        .expect(200);
    });

    it('ADMIN can access colaborador-only endpoint', async () => {
      currentTestUser = { id: users.adminOrg1.id, email: 'admin1@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/colaborador-only')
        .set('x-organization-id', org1.id)
        .expect(200);
    });

    it('GESTOR can access colaborador-only endpoint', async () => {
      currentTestUser = { id: users.gestorOrg1.id, email: 'gestor1@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/colaborador-only')
        .set('x-organization-id', org1.id)
        .expect(200);
    });
  });

  describe('403 Forbidden - Lower roles cannot access higher role endpoints', () => {
    it('ADMIN cannot access super-admin-only endpoint', async () => {
      currentTestUser = { id: users.adminOrg1.id, email: 'admin1@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/super-admin-only')
        .set('x-organization-id', org1.id)
        .expect(403);
    });

    it('GESTOR cannot access admin-only endpoint', async () => {
      currentTestUser = { id: users.gestorOrg1.id, email: 'gestor1@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/admin-only')
        .set('x-organization-id', org1.id)
        .expect(403);
    });

    it('GESTOR cannot access super-admin-only endpoint', async () => {
      currentTestUser = { id: users.gestorOrg1.id, email: 'gestor1@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/super-admin-only')
        .set('x-organization-id', org1.id)
        .expect(403);
    });

    it('COLABORADOR cannot access gestor-only endpoint', async () => {
      currentTestUser = {
        id: users.colaboradorOrg1.id,
        email: 'colaborador1@test.com',
      };

      await request(app.getHttpServer())
        .get('/test-rbac/gestor-only')
        .set('x-organization-id', org1.id)
        .expect(403);
    });

    it('COLABORADOR cannot access admin-only endpoint', async () => {
      currentTestUser = {
        id: users.colaboradorOrg1.id,
        email: 'colaborador1@test.com',
      };

      await request(app.getHttpServer())
        .get('/test-rbac/admin-only')
        .set('x-organization-id', org1.id)
        .expect(403);
    });

    it('COLABORADOR cannot access super-admin-only endpoint', async () => {
      currentTestUser = {
        id: users.colaboradorOrg1.id,
        email: 'colaborador1@test.com',
      };

      await request(app.getHttpServer())
        .get('/test-rbac/super-admin-only')
        .set('x-organization-id', org1.id)
        .expect(403);
    });
  });

  describe('Organization Isolation', () => {
    it('ADMIN from Org1 cannot access Org2 endpoints', async () => {
      currentTestUser = { id: users.adminOrg1.id, email: 'admin1@test.com' };

      // Admin from Org1 trying to access with Org2 header
      await request(app.getHttpServer())
        .get('/test-rbac/admin-only')
        .set('x-organization-id', org2.id)
        .expect(403);
    });

    it('GESTOR from Org1 cannot access Org2 endpoints', async () => {
      currentTestUser = { id: users.gestorOrg1.id, email: 'gestor1@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/gestor-only')
        .set('x-organization-id', org2.id)
        .expect(403);
    });

    it('COLABORADOR from Org1 cannot access Org2 endpoints', async () => {
      currentTestUser = {
        id: users.colaboradorOrg1.id,
        email: 'colaborador1@test.com',
      };

      await request(app.getHttpServer())
        .get('/test-rbac/colaborador-only')
        .set('x-organization-id', org2.id)
        .expect(403);
    });

    it('ADMIN from Org2 can access their own org endpoints', async () => {
      currentTestUser = { id: users.adminOrg2.id, email: 'admin2@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/admin-only')
        .set('x-organization-id', org2.id)
        .expect(200);
    });

    it('GESTOR from Org2 can access their own org endpoints', async () => {
      currentTestUser = { id: users.gestorOrg2.id, email: 'gestor2@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/gestor-only')
        .set('x-organization-id', org2.id)
        .expect(200);
    });
  });

  describe('Missing Organization Header', () => {
    it('ADMIN cannot access protected endpoint without organization header', async () => {
      currentTestUser = { id: users.adminOrg1.id, email: 'admin1@test.com' };

      // No x-organization-id header
      await request(app.getHttpServer())
        .get('/test-rbac/admin-only')
        .expect(403);
    });

    it('GESTOR cannot access protected endpoint without organization header', async () => {
      currentTestUser = { id: users.gestorOrg1.id, email: 'gestor1@test.com' };

      await request(app.getHttpServer())
        .get('/test-rbac/gestor-only')
        .expect(403);
    });

    it('COLABORADOR cannot access protected endpoint without organization header', async () => {
      currentTestUser = {
        id: users.colaboradorOrg1.id,
        email: 'colaborador1@test.com',
      };

      await request(app.getHttpServer())
        .get('/test-rbac/colaborador-only')
        .expect(403);
    });

    it('SUPER_ADMIN can access protected endpoint without organization header', async () => {
      currentTestUser = {
        id: users.superAdmin.id,
        email: 'superadmin@test.com',
      };

      // SUPER_ADMIN bypasses organization check
      await request(app.getHttpServer())
        .get('/test-rbac/super-admin-only')
        .expect(200);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should return 403 for protected endpoint without authentication', async () => {
      currentTestUser = null; // No authenticated user

      await request(app.getHttpServer())
        .get('/test-rbac/admin-only')
        .set('x-organization-id', org1.id)
        .expect(403);
    });

    it('should return 403 for super-admin endpoint without authentication', async () => {
      currentTestUser = null;

      await request(app.getHttpServer())
        .get('/test-rbac/super-admin-only')
        .expect(403);
    });
  });

  describe('Public Endpoints', () => {
    it('public endpoint should be accessible without authentication', async () => {
      currentTestUser = null;

      const response = await request(app.getHttpServer())
        .get('/test-rbac/public')
        .expect(200);

      const body = response.body as PublicEndpointResponse;
      expect(body.message).toContain('Public access');
    });

    it('public endpoint should be accessible by any authenticated user', async () => {
      currentTestUser = {
        id: users.colaboradorOrg1.id,
        email: 'colaborador1@test.com',
      };

      const response = await request(app.getHttpServer())
        .get('/test-rbac/public')
        .expect(200);

      const body = response.body as PublicEndpointResponse;
      expect(body.message).toContain('Public access');
    });
  });
});
