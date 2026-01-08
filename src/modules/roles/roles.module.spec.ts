import { RolesModule } from './roles.module';
import { RoleSchema } from './infrastructure/persistence/role.schema';
import { PermissionSchema } from './infrastructure/persistence/permission.schema';
import { UserRoleSchema } from './infrastructure/persistence/user-role.schema';

describe('RolesModule', () => {
  it('should be defined', () => {
    expect(RolesModule).toBeDefined();
  });

  it('should have role schema defined', () => {
    expect(RoleSchema).toBeDefined();
  });

  it('should have permission schema defined', () => {
    expect(PermissionSchema).toBeDefined();
  });

  it('should have user-role schema defined', () => {
    expect(UserRoleSchema).toBeDefined();
  });
});
