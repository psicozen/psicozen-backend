/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BaseEntity } from '../../../../core/domain/entities/base.entity';
import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';
import {
  OrganizationSettings,
  OrganizationType,
  DEFAULT_ORGANIZATION_SETTINGS,
  isValidOrganizationType,
} from '../types/organization-settings.types';

/**
 * Organization Domain Entity
 * Represents a company, department, or team in the system
 */
export class OrganizationEntity extends BaseEntity {
  name: string;
  slug: string;
  type: OrganizationType;
  settings: OrganizationSettings;
  parentId?: string;
  isActive: boolean;

  constructor(partial?: Partial<OrganizationEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /**
   * Factory method to create a new OrganizationEntity with validation
   */
  static create(data: {
    name: string;
    type: OrganizationType;
    settings?: Partial<OrganizationSettings>;
    parentId?: string;
  }): OrganizationEntity {
    // Validate name
    if (!data.name || data.name.length < 3 || data.name.length > 100) {
      throw new ValidationException({
        name: ['O nome da organização deve ter entre 3 e 100 caracteres'],
      });
    }

    // Validate type
    if (!isValidOrganizationType(data.type)) {
      throw new ValidationException({
        type: ['Tipo de organização inválido'],
      });
    }

    // Validate settings if provided
    if (data.settings) {
      OrganizationEntity.validateSettings(data.settings);
    }

    return new OrganizationEntity({
      name: data.name,
      slug: OrganizationEntity.generateSlug(data.name),
      type: data.type,
      settings: { ...DEFAULT_ORGANIZATION_SETTINGS, ...data.settings },
      parentId: data.parentId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update organization details (name and slug)
   */
  updateDetails(data: { name?: string; slug?: string }): void {
    if (data.name) {
      if (data.name.length < 3 || data.name.length > 100) {
        throw new ValidationException({
          name: ['O nome da organização deve ter entre 3 e 100 caracteres'],
        });
      }
      this.name = data.name;
    }
    if (data.slug) {
      this.slug = data.slug;
    }
    this.touch();
  }

  /**
   * Updates organization settings with validation
   */
  updateSettings(partial: Partial<OrganizationSettings>): void {
    OrganizationEntity.validateSettings(partial);
    // Type-safe merge using individual property assignment
    this.settings = this.mergeSettings(this.settings, partial);
    this.touch();
  }

  /**
   * Merges settings with validation ensuring type-safety
   */
  private mergeSettings(
    current: OrganizationSettings,
    updates: Partial<OrganizationSettings>,
  ): OrganizationSettings {
    return {
      timezone: updates.timezone ?? current.timezone,
      locale: updates.locale ?? current.locale,
      emociogramaEnabled:
        updates.emociogramaEnabled ?? current.emociogramaEnabled,
      alertThreshold: updates.alertThreshold ?? current.alertThreshold,
      dataRetentionDays: updates.dataRetentionDays ?? current.dataRetentionDays,
      anonymityDefault: updates.anonymityDefault ?? current.anonymityDefault,
    };
  }

  /**
   * Deactivates the organization (soft delete)
   */
  deactivate(): void {
    this.isActive = false;
    this.markAsDeleted();
  }

  /**
   * Activates the organization
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

  /**
   * Generates a URL-friendly slug from a name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Validates settings values with type-safe property access
   */
  private static validateSettings(
    settings: Partial<OrganizationSettings>,
  ): void {
    const errors: Record<string, string[]> = {};

    // Validate alert threshold
    if (settings.alertThreshold !== undefined) {
      if (typeof settings.alertThreshold !== 'number') {
        errors.alertThreshold = ['O limite de alerta deve ser um número'];
      } else if (settings.alertThreshold < 1 || settings.alertThreshold > 10) {
        errors.alertThreshold = ['O limite de alerta deve estar entre 1 e 10'];
      }
    }

    // Validate data retention days
    if (settings.dataRetentionDays !== undefined) {
      if (typeof settings.dataRetentionDays !== 'number') {
        errors.dataRetentionDays = ['O período de retenção deve ser um número'];
      } else if (
        settings.dataRetentionDays < 1 ||
        settings.dataRetentionDays > 3650
      ) {
        errors.dataRetentionDays = [
          'A retenção de dados deve estar entre 1 e 3650 dias',
        ];
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(errors);
    }
  }
}
