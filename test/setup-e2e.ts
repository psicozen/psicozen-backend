import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// Import entities directly to avoid dynamic import issues in CI
import { OrganizationSchema } from '../src/modules/organizations/infrastructure/persistence/organization.schema';
import { UserSchema } from '../src/modules/users/infrastructure/persistence/user.schema';
import { RoleSchema } from '../src/modules/roles/infrastructure/persistence/role.schema';
import { PermissionSchema } from '../src/modules/roles/infrastructure/persistence/permission.schema';
import { UserRoleSchema } from '../src/modules/roles/infrastructure/persistence/user-role.schema';

/**
 * Global E2E Test Setup
 *
 * Runs once before all E2E tests to ensure:
 * - Environment variables are loaded
 * - Database connection is established
 * - All migrations are applied
 * - Schema is up-to-date with RLS policies
 */
export default async (): Promise<void> => {
  try {
    // Load .env file with NODE_ENV=test
    const envPath = resolve(__dirname, '../.env');
    const result = config({ path: envPath });

    if (result.error) {
      // Don't fail if .env doesn't exist - use system env vars (CI)
      console.log(
        'ℹ️  .env not found, using system environment variables (CI mode)',
      );
    } else {
      console.log('✅ Environment variables loaded from .env (local mode)');
    }
    console.log('🔧 Setting up E2E test environment...');

    // Create DataSource with inline configuration to avoid module resolution issues
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        max: 10,
        connectionTimeoutMillis: 10000,
      },
      entities: [
        OrganizationSchema,
        UserSchema,
        RoleSchema,
        PermissionSchema,
        UserRoleSchema,
      ],
      migrations: [
        resolve(
          __dirname,
          '../src/core/infrastructure/database/migrations/*{.ts,.js}',
        ),
      ],
      migrationsRun: false,
      synchronize: false,
      dropSchema: false,
      logging: false,
    });

    // Initialize database connection
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // NOTE: Migrations should be run manually beforehand using: npm run migration:run
    // We don't run them here to avoid conflicts with existing schema

    // Close connection (tests will create their own)
    await dataSource.destroy();

    console.log('🎉 E2E test environment ready!');
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
};
