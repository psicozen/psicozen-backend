import { BaseEntity } from '../../../../core/domain/entities/base.entity';
import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';
import {
  OrganizationSettings,
  OrganizationType,
  DEFAULT_ORGANIZATION_SETTINGS,
  VALID_ORGANIZATION_TYPES,
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
    if (!VALID_ORGANIZATION_TYPES.includes(data.type)) {
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
   * Updates organization settings with validation
   */
  updateSettings(partial: Partial<OrganizationSettings>): void {
    OrganizationEntity.validateSettings(partial);
    this.settings = { ...this.settings, ...partial };
    this.touch();
  }

  /**
   * Deactivates the organization (soft delete)
   */
  deactivate(): void {
    this.isActive = false;
    this.markAsDeleted();
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
   * Validates settings values
   */
  private static validateSettings(
    settings: Partial<OrganizationSettings>,
  ): void {
    const errors: Record<string, string[]> = {};

    // Validate alert threshold
    if (settings.alertThreshold !== undefined) {
      if (settings.alertThreshold < 1 || settings.alertThreshold > 10) {
        errors.alertThreshold = [
          'O limite de alerta deve estar entre 1 e 10',
        ];
      }
    }

    // Validate data retention days
    if (settings.dataRetentionDays !== undefined) {
      if (settings.dataRetentionDays < 1 || settings.dataRetentionDays > 3650) {
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
