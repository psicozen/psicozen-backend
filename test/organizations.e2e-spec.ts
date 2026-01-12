import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';

// Module and Components
import { OrganizationsModule } from '../src/modules/organizations/organizations.module';
import { OrganizationSchema } from '../src/modules/organizations/infrastructure/persistence/organization.schema';
import { JwtAuthGuard } from '../src/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../src/core/presentation/guards/roles.guard';
import { ROLES_KEY } from '../src/core/presentation/decorators/roles.decorator';
import type {
  OrganizationSettings,
  OrganizationType,
} from '../src/modules/organizations/domain/types/organization-settings.types';

/**
 * E2E Tests for Organizations Module
 *
 * Uses SQLite in-memory database for isolation and speed.
 * Tests all CRUD operations with role-based authorization:
 * - POST /organizations (SUPER_ADMIN only)
 * - GET /organizations (ADMIN, SUPER_ADMIN)
 * - GET /organizations/:id (ADMIN, SUPER_ADMIN)
 * - PATCH /organizations/:id/settings (ADMIN, SUPER_ADMIN)
 * - DELETE /organizations/:id (SUPER_ADMIN only)
 */

// Type definitions for test users
interface TestUser {
  id: string;
  email: string;
  role: string;
}

// Type definitions for API responses
interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  settings: OrganizationSettings;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ErrorResponse {
  message: string | string[];
  error?: string;
  statusCode: number;
}

// HTTP Request type
interface HttpRequest {
  user?: TestUser;
}

// Mock users for testing different roles
const mockUsers: Record<string, TestUser> = {
  superAdmin: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'super@test.com',
    role: 'super_admin',
  },
  admin: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'admin@test.com',
    role: 'admin',
  },
  user: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'user@test.com',
    role: 'user',
  },
};

// Current test user - can be changed per test
let currentTestUser: TestUser = mockUsers.superAdmin;

// Helper to switch test user
const setTestUser = (user: TestUser): void => {
  currentTestUser = user;
};

// Valid organization data for tests
const validOrganization = {
  name: 'Test Organization',
  type: 'company' as const,
};

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // SQLite in-memory database for tests
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [OrganizationSchema],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        OrganizationsModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext): boolean => {
          const req = context.switchToHttp().getRequest<HttpRequest>();
          req.user = currentTestUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: ExecutionContext): boolean => {
          const reflector = new Reflector();
          const requiredRoles = reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
          );

          if (!requiredRoles || requiredRoles.length === 0) {
            return true;
          }

          const req = context.switchToHttp().getRequest<HttpRequest>();
          const user = req.user;

          if (!user) {
            return false;
          }

          return requiredRoles.some((role) => user.role === role);
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Configure ValidationPipe same as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up organizations table before each test
    await dataSource.getRepository(OrganizationSchema).clear();
    // Reset to SUPER_ADMIN for each test
    setTestUser(mockUsers.superAdmin);
  });

  // ============================================
  // POST /organizations (Create)
  // ============================================
  describe('POST /organizations', () => {
    describe('Success Cases', () => {
      it('should create organization with valid data (SUPER_ADMIN)', async () => {
        const response = await request(app.getHttpServer())
          .post('/organizations')
          .send(validOrganization)
          .expect(201);

        const body = response.body as ApiResponse<OrganizationData>;
        expect(body.data).toHaveProperty('id');
        expect(body.data.name).toBe(validOrganization.name);
        expect(body.data.type).toBe(validOrganization.type);
        expect(body.data.slug).toBe('test-organization');
        expect(body.data.isActive).toBe(true);
        expect(body.data).toHaveProperty('settings');
        expect(body.data.settings).toHaveProperty('timezone');
        expect(body.data.settings).toHaveProperty('locale');
      });

      it('should create organization with custom settings', async () => {
        const orgWithSettings = {
          ...validOrganization,
          name: 'Custom Settings Org',
          settings: {
            timezone: 'Europe/London',
            locale: 'en-GB',
            alertThreshold: 8,
          },
        };

        const response = await request(app.getHttpServer())
          .post('/organizations')
          .send(orgWithSettings)
          .expect(201);

        const body = response.body as ApiResponse<OrganizationData>;
        expect(body.data.settings.timezone).toBe('Europe/London');
        expect(body.data.settings.locale).toBe('en-GB');
        expect(body.data.settings.alertThreshold).toBe(8);
      });

      it('should create child organization with valid parentId', async () => {
        // Create parent first
        const parentResponse = await request(app.getHttpServer())
          .post('/organizations')
          .send({ name: 'Parent Org', type: 'company' })
          .expect(201);

        const parentBody = parentResponse.body as ApiResponse<OrganizationData>;
        const parentId = parentBody.data.id;

        // Create child
        const childResponse = await request(app.getHttpServer())
          .post('/organizations')
          .send({
            name: 'Child Org',
            type: 'department',
            parentId,
          })
          .expect(201);

        const childBody = childResponse.body as ApiResponse<OrganizationData>;
        expect(childBody.data.parentId).toBe(parentId);
      });
    });

    describe('Validation Errors (400)', () => {
      it('should return 400 for name too short (<3 chars)', async () => {
        const response = await request(app.getHttpServer())
          .post('/organizations')
          .send({ name: 'AB', type: 'company' })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain(
          'O nome da organização deve ter no mínimo 3 caracteres',
        );
      });

      it('should return 400 for name too long (>100 chars)', async () => {
        const longName = 'A'.repeat(101);
        const response = await request(app.getHttpServer())
          .post('/organizations')
          .send({ name: longName, type: 'company' })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain(
          'O nome da organização deve ter no máximo 100 caracteres',
        );
      });

      it('should return 400 for invalid type', async () => {
        const response = await request(app.getHttpServer())
          .post('/organizations')
          .send({ name: 'Valid Name', type: 'invalid_type' })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain(
          'O tipo da organização deve ser: company, department ou team',
        );
      });

      it('should return 400 for invalid parentId (not UUID)', async () => {
        const response = await request(app.getHttpServer())
          .post('/organizations')
          .send({ ...validOrganization, parentId: 'not-a-uuid' })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain(
          'O ID da organização pai deve ser um UUID válido',
        );
      });

      it('should return 400 for missing required fields', async () => {
        await request(app.getHttpServer())
          .post('/organizations')
          .send({})
          .expect(400);
      });

      it('should return 400 for missing type', async () => {
        await request(app.getHttpServer())
          .post('/organizations')
          .send({ name: 'Valid Name' })
          .expect(400);
      });
    });

    describe('Conflict Errors (409)', () => {
      it('should return 409 for duplicate slug', async () => {
        // Create first organization
        await request(app.getHttpServer())
          .post('/organizations')
          .send(validOrganization)
          .expect(201);

        // Try to create with same name (same slug)
        const response = await request(app.getHttpServer())
          .post('/organizations')
          .send(validOrganization)
          .expect(409);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain('already exists');
      });

      it('should return 409 for non-existent parentId', async () => {
        // Use a valid UUID v4 format that doesn't exist in database
        // UUID v4 requires: version bit (4) at position 13, variant bits (8/9/a/b) at position 17
        const nonExistentUuid = '12345678-1234-4567-a901-123456789abc';

        const response = await request(app.getHttpServer())
          .post('/organizations')
          .send({
            ...validOrganization,
            name: 'Org With Invalid Parent',
            parentId: nonExistentUuid,
          })
          .expect(409);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain('Parent organization');
      });
    });

    describe('Authorization Errors (403)', () => {
      it('should return 403 for ADMIN role', async () => {
        setTestUser(mockUsers.admin);

        await request(app.getHttpServer())
          .post('/organizations')
          .send(validOrganization)
          .expect(403);
      });

      it('should return 403 for USER role', async () => {
        setTestUser(mockUsers.user);

        await request(app.getHttpServer())
          .post('/organizations')
          .send(validOrganization)
          .expect(403);
      });
    });
  });

  // ============================================
  // GET /organizations (List)
  // ============================================
  describe('GET /organizations', () => {
    beforeEach(async () => {
      // Create some test organizations
      setTestUser(mockUsers.superAdmin);
      await request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'Org One', type: 'company' });
      await request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'Org Two', type: 'department' });
      await request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'Org Three', type: 'team' });
    });

    describe('Success Cases', () => {
      it('should list organizations with pagination (SUPER_ADMIN)', async () => {
        const response = await request(app.getHttpServer())
          .get('/organizations')
          .query({ page: 1, limit: 10 })
          .expect(200);

        const body = response.body as PaginatedResponse<OrganizationData>;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('meta');
        expect(body.meta).toHaveProperty('total');
        expect(body.meta).toHaveProperty('page');
        expect(body.meta).toHaveProperty('limit');
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBe(3);
      });

      it('should list organizations (ADMIN)', async () => {
        setTestUser(mockUsers.admin);

        const response = await request(app.getHttpServer())
          .get('/organizations')
          .expect(200);

        const body = response.body as PaginatedResponse<OrganizationData>;
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBe(true);
      });

      it('should apply pagination correctly', async () => {
        const response = await request(app.getHttpServer())
          .get('/organizations')
          .query({ page: 1, limit: 2 })
          .expect(200);

        const body = response.body as PaginatedResponse<OrganizationData>;
        expect(body.data.length).toBe(2);
        expect(body.meta.total).toBe(3);
        expect(body.meta.page).toBe(1);
        expect(body.meta.limit).toBe(2);
      });

      it('should return second page correctly', async () => {
        const response = await request(app.getHttpServer())
          .get('/organizations')
          .query({ page: 2, limit: 2 })
          .expect(200);

        const body = response.body as PaginatedResponse<OrganizationData>;
        expect(body.data.length).toBe(1);
        expect(body.meta.page).toBe(2);
      });
    });

    describe('Authorization Errors (403)', () => {
      it('should return 403 for USER role', async () => {
        setTestUser(mockUsers.user);

        await request(app.getHttpServer()).get('/organizations').expect(403);
      });
    });
  });

  // ============================================
  // GET /organizations/:id (Get One)
  // ============================================
  describe('GET /organizations/:id', () => {
    let createdOrgId: string;

    beforeEach(async () => {
      setTestUser(mockUsers.superAdmin);
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'Get Test Org', type: 'company' });
      const body = response.body as ApiResponse<OrganizationData>;
      createdOrgId = body.data.id;
    });

    describe('Success Cases', () => {
      it('should return organization by ID (SUPER_ADMIN)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/organizations/${createdOrgId}`)
          .expect(200);

        const body = response.body as ApiResponse<OrganizationData>;
        expect(body.data.id).toBe(createdOrgId);
        expect(body.data.name).toBe('Get Test Org');
        expect(body.data.type).toBe('company');
        expect(body.data).toHaveProperty('settings');
      });

      it('should return organization by ID (ADMIN)', async () => {
        setTestUser(mockUsers.admin);

        const response = await request(app.getHttpServer())
          .get(`/organizations/${createdOrgId}`)
          .expect(200);

        const body = response.body as ApiResponse<OrganizationData>;
        expect(body.data.id).toBe(createdOrgId);
      });
    });

    describe('Not Found Errors (404)', () => {
      it('should return 404 for non-existent ID', async () => {
        await request(app.getHttpServer())
          .get('/organizations/00000000-0000-0000-0000-000000000000')
          .expect(404);
      });
    });

    describe('Authorization Errors (403)', () => {
      it('should return 403 for USER role', async () => {
        setTestUser(mockUsers.user);

        await request(app.getHttpServer())
          .get(`/organizations/${createdOrgId}`)
          .expect(403);
      });
    });
  });

  // ============================================
  // PATCH /organizations/:id/settings (Update Settings)
  // ============================================
  describe('PATCH /organizations/:id/settings', () => {
    let createdOrgId: string;

    beforeEach(async () => {
      setTestUser(mockUsers.superAdmin);
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'Settings Test Org', type: 'company' });
      const body = response.body as ApiResponse<OrganizationData>;
      createdOrgId = body.data.id;
    });

    describe('Success Cases', () => {
      it('should update settings (SUPER_ADMIN)', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({ alertThreshold: 8 })
          .expect(200);

        const body = response.body as ApiResponse<OrganizationData>;
        expect(body.data.settings.alertThreshold).toBe(8);
      });

      it('should update settings (ADMIN)', async () => {
        setTestUser(mockUsers.admin);

        const response = await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({ locale: 'en-US' })
          .expect(200);

        const body = response.body as ApiResponse<OrganizationData>;
        expect(body.data.settings.locale).toBe('en-US');
      });

      it('should update multiple settings at once', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({
            timezone: 'Europe/Paris',
            locale: 'fr-FR',
            emociogramaEnabled: false,
            alertThreshold: 9,
            dataRetentionDays: 730,
            anonymityDefault: true,
          })
          .expect(200);

        const body = response.body as ApiResponse<OrganizationData>;
        expect(body.data.settings.timezone).toBe('Europe/Paris');
        expect(body.data.settings.locale).toBe('fr-FR');
        expect(body.data.settings.emociogramaEnabled).toBe(false);
        expect(body.data.settings.alertThreshold).toBe(9);
        expect(body.data.settings.dataRetentionDays).toBe(730);
        expect(body.data.settings.anonymityDefault).toBe(true);
      });

      it('should preserve unmodified settings', async () => {
        // Get current settings
        const getBefore = await request(app.getHttpServer())
          .get(`/organizations/${createdOrgId}`)
          .expect(200);

        const beforeBody = getBefore.body as ApiResponse<OrganizationData>;
        const originalTimezone = beforeBody.data.settings.timezone;

        // Update only alertThreshold
        const response = await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({ alertThreshold: 7 })
          .expect(200);

        const body = response.body as ApiResponse<OrganizationData>;
        // Timezone should remain unchanged
        expect(body.data.settings.timezone).toBe(originalTimezone);
        expect(body.data.settings.alertThreshold).toBe(7);
      });
    });

    describe('Validation Errors (400)', () => {
      it('should return 400 for alertThreshold > 10', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({ alertThreshold: 15 })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain(
          'O limite de alerta deve ser no máximo 10',
        );
      });

      it('should return 400 for alertThreshold < 1', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({ alertThreshold: 0 })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain(
          'O limite de alerta deve ser no mínimo 1',
        );
      });

      it('should return 400 for dataRetentionDays < 1', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({ dataRetentionDays: 0 })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain(
          'O período de retenção deve ser no mínimo 1 dia',
        );
      });

      it('should return 400 for dataRetentionDays > 3650', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({ dataRetentionDays: 4000 })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain(
          'O período de retenção deve ser no máximo 3650 dias (10 anos)',
        );
      });
    });

    describe('Not Found Errors (404)', () => {
      it('should return 404 for non-existent ID', async () => {
        await request(app.getHttpServer())
          .patch('/organizations/00000000-0000-0000-0000-000000000000/settings')
          .send({ alertThreshold: 5 })
          .expect(404);
      });
    });

    describe('Authorization Errors (403)', () => {
      it('should return 403 for USER role', async () => {
        setTestUser(mockUsers.user);

        await request(app.getHttpServer())
          .patch(`/organizations/${createdOrgId}/settings`)
          .send({ alertThreshold: 5 })
          .expect(403);
      });
    });
  });

  // ============================================
  // DELETE /organizations/:id (Soft Delete)
  // ============================================
  describe('DELETE /organizations/:id', () => {
    let createdOrgId: string;

    beforeEach(async () => {
      setTestUser(mockUsers.superAdmin);
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'Delete Test Org', type: 'company' });
      const body = response.body as ApiResponse<OrganizationData>;
      createdOrgId = body.data.id;
    });

    describe('Success Cases', () => {
      it('should soft delete organization (SUPER_ADMIN)', async () => {
        await request(app.getHttpServer())
          .delete(`/organizations/${createdOrgId}`)
          .expect(204);

        // Verify it's deleted (should return 404)
        await request(app.getHttpServer())
          .get(`/organizations/${createdOrgId}`)
          .expect(404);
      });
    });

    describe('Not Found Errors (404)', () => {
      it('should return 404 for non-existent ID', async () => {
        await request(app.getHttpServer())
          .delete('/organizations/00000000-0000-0000-0000-000000000000')
          .expect(404);
      });

      it('should return 404 when trying to delete already deleted organization', async () => {
        // Delete once
        await request(app.getHttpServer())
          .delete(`/organizations/${createdOrgId}`)
          .expect(204);

        // Try to delete again
        await request(app.getHttpServer())
          .delete(`/organizations/${createdOrgId}`)
          .expect(404);
      });
    });

    describe('Conflict Errors (409)', () => {
      it('should return 409 when organization has children', async () => {
        // Create child organization
        await request(app.getHttpServer())
          .post('/organizations')
          .send({
            name: 'Child Org',
            type: 'department',
            parentId: createdOrgId,
          })
          .expect(201);

        // Try to delete parent
        const response = await request(app.getHttpServer())
          .delete(`/organizations/${createdOrgId}`)
          .expect(409);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain('child');
      });
    });

    describe('Authorization Errors (403)', () => {
      it('should return 403 for ADMIN role', async () => {
        setTestUser(mockUsers.admin);

        await request(app.getHttpServer())
          .delete(`/organizations/${createdOrgId}`)
          .expect(403);
      });

      it('should return 403 for USER role', async () => {
        setTestUser(mockUsers.user);

        await request(app.getHttpServer())
          .delete(`/organizations/${createdOrgId}`)
          .expect(403);
      });
    });
  });
});
