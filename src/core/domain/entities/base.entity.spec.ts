import { BaseEntity } from './base.entity';

class TestEntity extends BaseEntity {
  name: string;

  constructor(partial?: Partial<TestEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

describe('BaseEntity', () => {
  describe('constructor', () => {
    it('should create entity with partial data', () => {
      const partial = {
        id: 'test-123',
        name: 'Test Entity',
        createdAt: new Date('2024-01-01'),
      };

      const entity = new TestEntity(partial);

      expect(entity.id).toBe(partial.id);
      expect(entity.name).toBe(partial.name);
      expect(entity.createdAt).toEqual(partial.createdAt);
    });

    it('should create entity without partial data', () => {
      const entity = new TestEntity();

      expect(entity).toBeInstanceOf(BaseEntity);
    });
  });

  describe('isDeleted', () => {
    it('should return true when deletedAt is set', () => {
      const entity = new TestEntity({
        deletedAt: new Date(),
      });

      expect(entity.isDeleted()).toBe(true);
    });

    it('should return false when deletedAt is null', () => {
      const entity = new TestEntity({
        deletedAt: null,
      });

      expect(entity.isDeleted()).toBe(false);
    });

    it('should return false when deletedAt is undefined', () => {
      const entity = new TestEntity();

      expect(entity.isDeleted()).toBe(false);
    });
  });

  describe('markAsDeleted', () => {
    it('should set deletedAt and update updatedAt', () => {
      const entity = new TestEntity({
        updatedAt: new Date('2023-01-01'),
      });

      entity.markAsDeleted();

      expect(entity.deletedAt).toBeInstanceOf(Date);
      expect(entity.updatedAt.getTime()).toBeGreaterThan(
        new Date('2023-01-01').getTime(),
      );
    });
  });

  describe('touch', () => {
    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2023-01-01');
      const entity = new TestEntity({
        updatedAt: oldDate,
      });

      entity.touch();

      expect(entity.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });
});
