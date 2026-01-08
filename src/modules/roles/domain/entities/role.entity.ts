import { BaseEntity } from '../../../../core/domain/entities/base.entity';

export class RoleEntity extends BaseEntity {
  name: string;
  description: string;

  constructor(partial?: Partial<RoleEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }

  static create(name: string, description: string): RoleEntity {
    return new RoleEntity({
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
