import { PermissionSchema } from './permission.schema';

describe('PermissionSchema', () => {
  it('should be defined', () => {
    expect(PermissionSchema).toBeDefined();
  });

  it('should create instance with required properties', () => {
    const permission = new PermissionSchema();
    permission.name = 'users:create';
    permission.resource = 'users';
    permission.action = 'create';
    permission.description = 'Create new users';

    expect(permission.name).toBe('users:create');
    expect(permission.resource).toBe('users');
    expect(permission.action).toBe('create');
    expect(permission.description).toBe('Create new users');
  });

  it('should support CRUD actions', () => {
    const actions = ['create', 'read', 'update', 'delete'];

    actions.forEach((action) => {
      const permission = new PermissionSchema();
      permission.resource = 'users';
      permission.action = action;
      permission.name = `users:${action}`;

      expect(permission.action).toBe(action);
    });
  });

  it('should have timestamps', () => {
    const permission = new PermissionSchema();
    permission.createdAt = new Date();
    permission.updatedAt = new Date();

    expect(permission.createdAt).toBeInstanceOf(Date);
    expect(permission.updatedAt).toBeInstanceOf(Date);
  });
});
