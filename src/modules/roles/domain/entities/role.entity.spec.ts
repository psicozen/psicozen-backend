import { RoleEntity } from './role.entity';

describe('RoleEntity', () => {
  describe('create', () => {
    it('should create a role with name and description', () => {
      const name = 'admin';
      const description = 'Administrator role';

      const role = RoleEntity.create(name, description);

      expect(role.name).toBe(name);
      expect(role.description).toBe(description);
      expect(role.createdAt).toBeInstanceOf(Date);
      expect(role.updatedAt).toBeInstanceOf(Date);
    });

    it('should create role with all standard roles', () => {
      const roles = ['admin', 'moderator', 'user'];

      roles.forEach((roleName) => {
        const role = RoleEntity.create(roleName, `${roleName} role`);
        expect(role.name).toBe(roleName);
      });
    });
  });

  describe('constructor', () => {
    it('should create role from partial data', () => {
      const partial = {
        name: 'custom-role',
        description: 'Custom description',
        id: 'role-123',
      };

      const role = new RoleEntity(partial);

      expect(role.name).toBe(partial.name);
      expect(role.description).toBe(partial.description);
      expect(role.id).toBe(partial.id);
    });
  });
});
