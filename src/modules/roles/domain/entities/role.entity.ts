import { BaseEntity } from '../../../../core/domain/entities/base.entity';

export interface CreateRoleParams {
  name: string;
  description: string;
  organizationId?: string | null;
  hierarchyLevel?: number;
  isSystemRole?: boolean;
}

export class RoleEntity extends BaseEntity {
  name: string;
  description: string;
  organizationId: string | null;
  hierarchyLevel: number;
  isSystemRole: boolean;

  constructor(partial?: Partial<RoleEntity>) {
    super(partial);
    this.organizationId = null;
    this.hierarchyLevel = 100;
    this.isSystemRole = false;
    if (partial) {
      Object.assign(this, partial);
    }
  }

  static create(params: CreateRoleParams): RoleEntity;
  static create(name: string, description: string): RoleEntity;
  static create(
    nameOrParams: string | CreateRoleParams,
    description?: string,
  ): RoleEntity {
    if (typeof nameOrParams === 'string') {
      return new RoleEntity({
        name: nameOrParams,
        description: description ?? '',
        organizationId: null,
        hierarchyLevel: 100,
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return new RoleEntity({
      name: nameOrParams.name,
      description: nameOrParams.description,
      organizationId: nameOrParams.organizationId ?? null,
      hierarchyLevel: nameOrParams.hierarchyLevel ?? 100,
      isSystemRole: nameOrParams.isSystemRole ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Checks if this role belongs to a specific organization
   */
  belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  /**
   * Checks if this role has higher privilege than another role
   * Lower hierarchy level means higher privilege
   */
  hasHigherPrivilegeThan(other: RoleEntity): boolean {
    return this.hierarchyLevel < other.hierarchyLevel;
  }

  /**
   * Checks if this is a global system role (not organization-scoped)
   */
  isGlobal(): boolean {
    return this.isSystemRole && this.organizationId === null;
  }
}
