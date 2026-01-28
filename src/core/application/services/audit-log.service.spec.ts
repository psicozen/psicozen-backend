import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import type { AuditLogEntry } from './audit-log.service.interface';

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should log an audit entry successfully', async () => {
      const entry: AuditLogEntry = {
        action: 'user_data_anonymized',
        userId: 'user-001',
        organizationId: 'org-001',
        metadata: {
          reason: 'LGPD_compliance',
        },
      };

      const result = await service.log(entry);

      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.success).toBe(true);
    });

    it('should generate unique IDs for each log entry', async () => {
      const entry: AuditLogEntry = {
        action: 'user_data_exported',
        userId: 'user-001',
        organizationId: 'org-001',
      };

      const result1 = await service.log(entry);
      const result2 = await service.log(entry);

      expect(result1.id).not.toBe(result2.id);
    });

    it('should log LGPD actions with additional warning', async () => {
      const lgpdActions = [
        'user_data_anonymized',
        'user_data_exported',
        'user_data_deleted',
      ];

      for (const action of lgpdActions) {
        const entry: AuditLogEntry = {
          action,
          userId: 'user-001',
          organizationId: 'org-001',
        };

        const result = await service.log(entry);

        expect(result.success).toBe(true);
      }
    });

    it('should handle entries with all optional fields', async () => {
      const entry: AuditLogEntry = {
        action: 'data_access',
        userId: 'user-001',
        organizationId: 'org-001',
        performedBy: 'admin-001',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {
          resource: 'submissions',
          count: 10,
        },
      };

      const result = await service.log(entry);

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should handle entries with minimal fields', async () => {
      const entry: AuditLogEntry = {
        action: 'user_login',
        userId: 'user-001',
        organizationId: 'org-001',
      };

      const result = await service.log(entry);

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should handle custom action types', async () => {
      const entry: AuditLogEntry = {
        action: 'custom_action_type',
        userId: 'user-001',
        organizationId: 'org-001',
      };

      const result = await service.log(entry);

      expect(result.success).toBe(true);
    });

    it('should set timestamp close to current time', async () => {
      const beforeLog = new Date();

      const entry: AuditLogEntry = {
        action: 'security_event',
        userId: 'user-001',
        organizationId: 'org-001',
      };

      const result = await service.log(entry);

      const afterLog = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeLog.getTime(),
      );
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(
        afterLog.getTime(),
      );
    });

    it('should handle complex metadata objects', async () => {
      const entry: AuditLogEntry = {
        action: 'data_modification',
        userId: 'user-001',
        organizationId: 'org-001',
        metadata: {
          changes: {
            before: { status: 'active' },
            after: { status: 'inactive' },
          },
          affectedRecords: 5,
          timestamp: new Date().toISOString(),
          nested: {
            deep: {
              value: true,
            },
          },
        },
      };

      const result = await service.log(entry);

      expect(result.success).toBe(true);
    });
  });
});
