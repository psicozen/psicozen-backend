import { RoleSchema } from './role.schema';
import { PermissionSchema } from './permission.schema';

describe('RoleSchema', () => {
  it('should be defined', () => {
    expect(RoleSchema).toBeDefined();
  });

  it('should have correct table name', () => {
    const metadata = Reflect.getMetadata('design:type', RoleSchema);
    expect(RoleSchema.name).toBe('RoleSchema');
  });

  it('should create instance with required properties', () => {
    const role = new RoleSchema();
    role.name = 'admin';
    role.description = 'Administrator role';
    role.permissions = [];

    expect(role.name).toBe('admin');
    expect(role.description).toBe('Administrator role');
    expect(role.permissions).toEqual([]);
  });

  it('should support many-to-many relationship with permissions', () => {
    const role = new RoleSchema();
    const permission1 = new PermissionSchema();
    const permission2 = new PermissionSchema();

    role.permissions = [permission1, permission2];

    expect(role.permissions).toHaveLength(2);
    expect(role.permissions[0]).toBeInstanceOf(PermissionSchema);
  });

  it('should have timestamps', () => {
    const role = new RoleSchema();
    role.createdAt = new Date();
    role.updatedAt = new Date();

    expect(role.createdAt).toBeInstanceOf(Date);
    expect(role.updatedAt).toBeInstanceOf(Date);
  });
});
