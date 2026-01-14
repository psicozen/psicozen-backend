import { DataSource, DataSourceOptions } from 'typeorm';
import { resolve } from 'path';

// Entity Schemas
import { OrganizationSchema } from '../../src/modules/organizations/infrastructure/persistence/organization.schema';
import { UserSchema } from '../../src/modules/users/infrastructure/persistence/user.schema';
import { RoleSchema } from '../../src/modules/roles/infrastructure/persistence/role.schema';
import { PermissionSchema } from '../../src/modules/roles/infrastructure/persistence/permission.schema';
import { UserRoleSchema } from '../../src/modules/roles/infrastructure/persistence/user-role.schema';

/**
 * PostgreSQL Test Database Configuration Factory
 *
 * Uses staging PostgreSQL database with:
 * - Migration-based schema management (synchronize: false)
 * - Connection pooling for performance
 * - SSL disabled for Render staging tier
 *
 * IMPORTANT: Returns configuration dynamically to ensure environment
 * variables are loaded before creating DataSource
 */
export const getTestDataSourceOptions = (): DataSourceOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,

  // SSL Configuration - Required for Render PostgreSQL
  // Accept self-signed certificates
  ssl: {
    rejectUnauthorized: false,
  },

  // Connection Pooling
  extra: {
    max: 10,
    connectionTimeoutMillis: 10000,
  },

  // Entities
  entities: [
    OrganizationSchema,
    UserSchema,
    RoleSchema,
    PermissionSchema,
    UserRoleSchema,
  ],

  // Migrations (critical for PostgreSQL)
  migrations: [
    resolve(
      __dirname,
      '../../src/core/infrastructure/database/migrations/*{.ts,.js}',
    ),
  ],
  migrationsRun: false, // We'll run manually in test setup

  // Schema Management
  synchronize: false, // NEVER use synchronize with PostgreSQL + RLS
  dropSchema: false, // NEVER drop schema in shared staging DB

  // Logging
  logging: false,
  logger: 'advanced-console',
});

// For backward compatibility
export const testDataSourceOptions: DataSourceOptions =
  getTestDataSourceOptions();

// Singleton DataSource (lazy initialization)
let _testDataSource: DataSource | null = null;

export const TestDataSource = new Proxy(
  {} as DataSource,
  {
    get(_, prop) {
      if (!_testDataSource) {
        _testDataSource = new DataSource(getTestDataSourceOptions());
      }
      return _testDataSource[prop as keyof DataSource];
    },
  },
);
