import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// Load .env.test
config({ path: resolve(__dirname, '../../.env.test') });

// Import all entity schemas
import { OrganizationSchema } from '../../src/modules/organizations/infrastructure/persistence/organization.schema';
import { UserSchema } from '../../src/modules/users/infrastructure/persistence/user.schema';
import { RoleSchema } from '../../src/modules/roles/infrastructure/persistence/role.schema';
import { PermissionSchema } from '../../src/modules/roles/infrastructure/persistence/permission.schema';
import { UserRoleSchema } from '../../src/modules/roles/infrastructure/persistence/user-role.schema';

async function runStagingMigrations() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [
      OrganizationSchema,
      UserSchema,
      RoleSchema,
      PermissionSchema,
      UserRoleSchema,
    ],
    migrations: [
      resolve(__dirname, '../../src/core/infrastructure/database/migrations/*{.ts,.js}'),
    ],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to staging database (Render)');

    // Show pending migrations
    const pendingMigrations = await dataSource.showMigrations();
    if (pendingMigrations) {
      console.log('📦 Found pending migrations, running them...');

      // Run migrations
      const migrations = await dataSource.runMigrations();

      if (migrations.length === 0) {
        console.log('✅ No new migrations to run - database is up to date');
      } else {
        console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
        migrations.forEach(migration => {
          console.log(`   - ${migration.name}`);
        });
      }
    } else {
      console.log('✅ Database schema is up to date');
    }
  } catch (error) {
    console.error('❌ Failed to run migrations:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

runStagingMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
