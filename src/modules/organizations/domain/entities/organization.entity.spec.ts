import { OrganizationEntity } from './organization.entity';
import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';
import { DEFAULT_ORGANIZATION_SETTINGS } from '../types/organization-settings.types';

describe('OrganizationEntity', () => {
  describe('create', () => {
    it('should create organization with valid data and default settings', () => {
      const org = OrganizationEntity.create({
        name: 'Acme Corporation',
        type: 'company',
      });

      expect(org.name).toBe('Acme Corporation');
      expect(org.slug).toBe('acme-corporation');
      expect(org.type).toBe('company');
      expect(org.settings).toEqual(DEFAULT_ORGANIZATION_SETTINGS);
      expect(org.isActive).toBe(true);
      expect(org.parentId).toBeUndefined();
      expect(org.createdAt).toBeInstanceOf(Date);
      expect(org.updatedAt).toBeInstanceOf(Date);
    });

    it('should create organization with parentId', () => {
      const org = OrganizationEntity.create({
        name: 'Engineering Team',
        type: 'team',
        parentId: 'parent-uuid-123',
      });

      expect(org.parentId).toBe('parent-uuid-123');
      expect(org.type).toBe('team');
    });

    it('should create organization with custom settings', () => {
      const customSettings = {
        alertThreshold: 8,
        dataRetentionDays: 730,
      };

      const org = OrganizationEntity.create({
        name: 'Custom Org',
        type: 'department',
        settings: customSettings,
      });

      expect(org.settings.alertThreshold).toBe(8);
      expect(org.settings.dataRetentionDays).toBe(730);
    });

    it('should create organization with partial custom settings', () => {
      const org = OrganizationEntity.create({
        name: 'Partial Settings Org',
        type: 'company',
        settings: { alertThreshold: 3 },
      });

      expect(org.settings.alertThreshold).toBe(3);
      expect(org.settings.dataRetentionDays).toBe(
        DEFAULT_ORGANIZATION_SETTINGS.dataRetentionDays,
      );
    });

    it('should throw ValidationException when name is too short', () => {
      expect(() => {
        OrganizationEntity.create({
          name: 'AB',
          type: 'company',
        });
      }).toThrow(ValidationException);

      try {
        OrganizationEntity.create({ name: 'AB', type: 'company' });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        expect((error as ValidationException).errors.name).toContain(
          'O nome da organização deve ter entre 3 e 100 caracteres',
        );
      }
    });

    it('should throw ValidationException when name is empty', () => {
      expect(() => {
        OrganizationEntity.create({
          name: '',
          type: 'company',
        });
      }).toThrow(ValidationException);
    });

    it('should throw ValidationException when name is too long', () => {
      const longName = 'A'.repeat(101);

      expect(() => {
        OrganizationEntity.create({
          name: longName,
          type: 'company',
        });
      }).toThrow(ValidationException);

      try {
        OrganizationEntity.create({ name: longName, type: 'company' });
      } catch (error) {
        expect((error as ValidationException).errors.name).toContain(
          'O nome da organização deve ter entre 3 e 100 caracteres',
        );
      }
    });

    it('should accept name with exactly 3 characters', () => {
      const org = OrganizationEntity.create({
        name: 'ABC',
        type: 'company',
      });

      expect(org.name).toBe('ABC');
    });

    it('should accept name with exactly 100 characters', () => {
      const name100 = 'A'.repeat(100);
      const org = OrganizationEntity.create({
        name: name100,
        type: 'company',
      });

      expect(org.name).toBe(name100);
    });

    it('should throw ValidationException for invalid type', () => {
      expect(() => {
        OrganizationEntity.create({
          name: 'Test Org',
          type: 'invalid' as any,
        });
      }).toThrow(ValidationException);

      try {
        OrganizationEntity.create({
          name: 'Test Org',
          type: 'invalid' as any,
        });
      } catch (error) {
        expect((error as ValidationException).errors.type).toContain(
          'Tipo de organização inválido',
        );
      }
    });

    it('should accept all valid organization types', () => {
      const types = ['company', 'department', 'team'] as const;

      types.forEach((type) => {
        const org = OrganizationEntity.create({
          name: `Test ${type}`,
          type,
        });
        expect(org.type).toBe(type);
      });
    });

    it('should throw ValidationException for invalid settings on create', () => {
      expect(() => {
        OrganizationEntity.create({
          name: 'Test Org',
          type: 'company',
          settings: { alertThreshold: 0 },
        });
      }).toThrow(ValidationException);
    });
  });

  describe('generateSlug', () => {
    it('should generate slug from simple name', () => {
      const slug = OrganizationEntity.generateSlug('Acme Corporation');
      expect(slug).toBe('acme-corporation');
    });

    it('should handle accented characters', () => {
      const slug = OrganizationEntity.generateSlug('Organização São Paulo');
      expect(slug).toBe('organizacao-sao-paulo');
    });

    it('should handle special characters', () => {
      const slug = OrganizationEntity.generateSlug('Test & Demo (2024)');
      expect(slug).toBe('test-demo-2024');
    });

    it('should handle multiple spaces and hyphens', () => {
      const slug = OrganizationEntity.generateSlug('Test   Multiple   Spaces');
      expect(slug).toBe('test-multiple-spaces');
    });

    it('should remove leading and trailing hyphens', () => {
      const slug = OrganizationEntity.generateSlug('---Test Name---');
      expect(slug).toBe('test-name');
    });

    it('should handle uppercase letters', () => {
      const slug = OrganizationEntity.generateSlug('UPPERCASE NAME');
      expect(slug).toBe('uppercase-name');
    });

    it('should handle numbers', () => {
      const slug = OrganizationEntity.generateSlug('Company 123 Test');
      expect(slug).toBe('company-123-test');
    });

    it('should handle complex accented text', () => {
      const slug = OrganizationEntity.generateSlug('Café & Résumé Ñoño');
      expect(slug).toBe('cafe-resume-nono');
    });
  });

  describe('updateSettings', () => {
    it('should update settings and call touch', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });
      const originalUpdatedAt = org.updatedAt;

      // Small delay to ensure timestamp difference
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);

      org.updateSettings({ alertThreshold: 7 });

      expect(org.settings.alertThreshold).toBe(7);
      expect(org.settings.dataRetentionDays).toBe(
        DEFAULT_ORGANIZATION_SETTINGS.dataRetentionDays,
      );
      expect(org.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );

      jest.useRealTimers();
    });

    it('should update multiple settings at once', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      org.updateSettings({
        alertThreshold: 3,
        dataRetentionDays: 180,
      });

      expect(org.settings.alertThreshold).toBe(3);
      expect(org.settings.dataRetentionDays).toBe(180);
    });

    it('should accept alertThreshold at minimum boundary (1)', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      org.updateSettings({ alertThreshold: 1 });

      expect(org.settings.alertThreshold).toBe(1);
    });

    it('should accept alertThreshold at maximum boundary (10)', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      org.updateSettings({ alertThreshold: 10 });

      expect(org.settings.alertThreshold).toBe(10);
    });

    it('should throw ValidationException for alertThreshold below minimum', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      expect(() => {
        org.updateSettings({ alertThreshold: 0 });
      }).toThrow(ValidationException);

      try {
        org.updateSettings({ alertThreshold: 0 });
      } catch (error) {
        expect((error as ValidationException).errors.alertThreshold).toContain(
          'O limite de alerta deve estar entre 1 e 10',
        );
      }
    });

    it('should throw ValidationException for alertThreshold above maximum', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      expect(() => {
        org.updateSettings({ alertThreshold: 11 });
      }).toThrow(ValidationException);
    });

    it('should accept dataRetentionDays at minimum boundary (1)', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      org.updateSettings({ dataRetentionDays: 1 });

      expect(org.settings.dataRetentionDays).toBe(1);
    });

    it('should accept dataRetentionDays at maximum boundary (3650)', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      org.updateSettings({ dataRetentionDays: 3650 });

      expect(org.settings.dataRetentionDays).toBe(3650);
    });

    it('should throw ValidationException for dataRetentionDays below minimum', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      expect(() => {
        org.updateSettings({ dataRetentionDays: 0 });
      }).toThrow(ValidationException);

      try {
        org.updateSettings({ dataRetentionDays: 0 });
      } catch (error) {
        expect(
          (error as ValidationException).errors.dataRetentionDays,
        ).toContain('A retenção de dados deve estar entre 1 e 3650 dias');
      }
    });

    it('should throw ValidationException for dataRetentionDays above maximum', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      expect(() => {
        org.updateSettings({ dataRetentionDays: 3651 });
      }).toThrow(ValidationException);
    });

    it('should throw ValidationException with multiple errors', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      try {
        org.updateSettings({
          alertThreshold: 0,
          dataRetentionDays: 0,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        const validationError = error as ValidationException;
        expect(validationError.errors.alertThreshold).toBeDefined();
        expect(validationError.errors.dataRetentionDays).toBeDefined();
      }
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false and mark as deleted', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });

      expect(org.isActive).toBe(true);
      expect(org.deletedAt).toBeUndefined();

      org.deactivate();

      expect(org.isActive).toBe(false);
      expect(org.deletedAt).toBeInstanceOf(Date);
      expect(org.isDeleted()).toBe(true);
    });

    it('should update updatedAt when deactivating', () => {
      const org = OrganizationEntity.create({
        name: 'Test Org',
        type: 'company',
      });
      const originalUpdatedAt = org.updatedAt;

      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);

      org.deactivate();

      expect(org.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );

      jest.useRealTimers();
    });
  });

  describe('constructor', () => {
    it('should create entity from partial data', () => {
      const org = new OrganizationEntity({
        id: 'test-uuid',
        name: 'Test Org',
        slug: 'test-org',
        type: 'company',
        settings: DEFAULT_ORGANIZATION_SETTINGS,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      expect(org.id).toBe('test-uuid');
      expect(org.name).toBe('Test Org');
      expect(org.slug).toBe('test-org');
      expect(org.type).toBe('company');
    });

    it('should create empty entity without partial', () => {
      const org = new OrganizationEntity();

      expect(org.name).toBeUndefined();
      expect(org.slug).toBeUndefined();
    });
  });
});
