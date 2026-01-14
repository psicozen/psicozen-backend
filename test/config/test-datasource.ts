import { DataSource, DataSourceOptions } from 'typeorm';
import { OrganizationSchema } from '../../src/modules/organizations/infrastructure/persistence/organization.schema';
import { UserSchema } from '../../src/modules/users/infrastructure/persistence/user.schema';
import { RoleSchema } from '../../src/modules/roles/infrastructure/persistence/role.schema';
import { PermissionSchema } from '../../src/modules/roles/infrastructure/persistence/permission.schema';
import { UserRoleSchema } from '../../src/modules/roles/infrastructure/persistence/user-role.schema';

export const testDataSourceOptions: DataSourceOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  entities: [
    OrganizationSchema,
    UserSchema,
    RoleSchema,
    PermissionSchema,
    UserRoleSchema,
  ],
  synchronize: true,
  dropSchema: true,
  logging: false,
};

export const TestDataSource = new DataSource(testDataSourceOptions);
