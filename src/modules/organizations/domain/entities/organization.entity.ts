import { BaseEntity } from '../../../../core/domain/entities/base.entity';

/**
 * Organization type enum matching database constraint
 */
export type OrganizationType = 'company' | 'department' | 'team';

/**
 * Organization settings stored as JSONB
 */
export interface OrganizationSettings {
  [key: string]: unknown;
}

/**
 * Domain entity representing an organization in the system
 */
export class OrganizationEntity extends BaseEntity {
  name: string;
  slug: string;
  type: OrganizationType;
  settings: OrganizationSettings;
  parentId?: string | null;
  isActive: boolean;

  constructor(partial?: Partial<OrganizationEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /**
   * Factory method to create a new organization
   */
  static create(
    name: string,
    slug: string,
    type: OrganizationType,
    parentId?: string,
  ): OrganizationEntity {
    return new OrganizationEntity({
      name,
      slug,
      type,
      parentId: parentId ?? null,
      settings: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update organization details
   */
  updateDetails(data: { name?: string; slug?: string }): void {
    if (data.name) this.name = data.name;
    if (data.slug) this.slug = data.slug;
    this.touch();
  }

  /**
   * Update organization settings
   */
  updateSettings(settings: Partial<OrganizationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.touch();
  }

  /**
   * Deactivate the organization
   */
  deactivate(): void {
    this.isActive = false;
    this.touch();
  }

  /**
   * Activate the organization
   */
  activate(): void {
    this.isActive = true;
    this.touch();
  }

  /**
   * Check if organization is a root (no parent)
   */
  isRoot(): boolean {
    return this.parentId === null || this.parentId === undefined;
  }

  /**
   * Change parent organization
   */
  setParent(parentId: string | null): void {
    this.parentId = parentId;
    this.touch();
  }
}
