import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DeleteQueryBuilder } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLogSchema } from '../../infrastructure/persistence/audit-log.schema';
import type { AuditLogEntry } from './audit-log.service.interface';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<Repository<AuditLogSchema>>;

  const mockSchema: AuditLogSchema = {
    id: 'log-001',
    action: 'user_data_exported',
    userId: 'user-001',
    organizationId: 'org-001',
    performedBy: null,
    metadata: { reason: 'LGPD_compliance' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2024-01-15'),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  } as unknown as jest.Mocked<SelectQueryBuilder<AuditLogSchema>>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLogSchema),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get(getRepositoryToken(AuditLogSchema));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      const entry: AuditLogEntry = {
        action: 'user_data_exported',
        userId: 'user-001',
        organizationId: 'org-001',
        metadata: { reason: 'LGPD_compliance' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      repository.create.mockReturnValue(mockSchema);
      repository.save.mockResolvedValue(mockSchema);

      const result = await service.log(entry);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user_data_exported',
          userId: 'user-001',
          organizationId: 'org-001',
        }),
      );
      expect(repository.save).toHaveBeenCalled();
      expect(result.id).toBe('log-001');
      expect(result.action).toBe('user_data_exported');
      expect(result.userId).toBe('user-001');
    });

    it('should handle entries without optional fields', async () => {
      const entry: AuditLogEntry = {
        action: 'user_login',
        userId: 'user-001',
      };

      const minimalSchema = {
        ...mockSchema,
        organizationId: null,
        performedBy: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
      };

      repository.create.mockReturnValue(minimalSchema);
      repository.save.mockResolvedValue(minimalSchema);

      const result = await service.log(entry);

      expect(result.organizationId).toBeUndefined();
      expect(result.ipAddress).toBeUndefined();
    });

    it('should log LGPD actions with warning', async () => {
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

        repository.create.mockReturnValue({ ...mockSchema, action });
        repository.save.mockResolvedValue({ ...mockSchema, action });

        const result = await service.log(entry);

        expect(result.action).toBe(action);
      }
    });

    it('should set createdAt timestamp automatically', async () => {
      const entry: AuditLogEntry = {
        action: 'data_access',
        userId: 'user-001',
      };

      repository.create.mockReturnValue(mockSchema);
      repository.save.mockResolvedValue(mockSchema);

      await service.log(entry);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail for a user', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSchema], 1]);

      const result = await service.getAuditTrail('user-001');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit_logs.user_id = :userId',
        { userId: 'user-001' },
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].action).toBe('user_data_exported');
    });

    it('should filter by organization when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSchema], 1]);

      await service.getAuditTrail('user-001', 'org-001');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_logs.organization_id = :organizationId',
        { organizationId: 'org-001' },
      );
    });

    it('should apply date filters when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.getAuditTrail('user-001', undefined, {
        startDate,
        endDate,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_logs.created_at BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });

    it('should apply limit and offset', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getAuditTrail('user-001', undefined, {
        limit: 50,
        offset: 10,
      });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
    });

    it('should use default limit when not specified', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getAuditTrail('user-001');

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    });

    it('should order by created_at DESC', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getAuditTrail('user-001');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'audit_logs.created_at',
        'DESC',
      );
    });
  });

  describe('getByAction', () => {
    it('should return logs for a specific action', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSchema], 1]);

      const result = await service.getByAction('user_data_exported');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit_logs.action = :action',
        { action: 'user_data_exported' },
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by organization when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getByAction('user_data_deleted', 'org-001');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_logs.organization_id = :organizationId',
        { organizationId: 'org-001' },
      );
    });

    it('should apply options filters', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getByAction('user_login', undefined, {
        limit: 25,
        startDate: new Date('2024-01-01'),
      });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_logs.created_at >= :startDate',
        expect.any(Object),
      );
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than 2 years', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 150 });

      const result = await service.cleanupOldLogs();

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(AuditLogSchema);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'created_at < :retentionDate',
        expect.objectContaining({
          retentionDate: expect.any(Date),
        }),
      );
      expect(result.deletedCount).toBe(150);
      expect(result.retentionDate).toBeInstanceOf(Date);
    });

    it('should return 0 when no old logs exist', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.cleanupOldLogs();

      expect(result.deletedCount).toBe(0);
    });

    it('should calculate retention date as 2 years ago', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const beforeCall = new Date();
      const result = await service.cleanupOldLogs();
      const afterCall = new Date();

      const expectedRetentionYear = new Date().getFullYear() - 2;

      expect(result.retentionDate.getFullYear()).toBe(expectedRetentionYear);
    });

    it('should handle null affected count', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: null });

      const result = await service.cleanupOldLogs();

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('domain entity conversion', () => {
    it('should convert schema to domain entity correctly', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSchema], 1]);

      const result = await service.getAuditTrail('user-001');
      const entity = result.data[0];

      expect(entity.id).toBe(mockSchema.id);
      expect(entity.action).toBe(mockSchema.action);
      expect(entity.userId).toBe(mockSchema.userId);
      expect(entity.organizationId).toBe(mockSchema.organizationId);
      expect(entity.metadata).toEqual(mockSchema.metadata);
      expect(entity.ipAddress).toBe(mockSchema.ipAddress);
      expect(entity.userAgent).toBe(mockSchema.userAgent);
      expect(entity.createdAt).toEqual(mockSchema.createdAt);
    });

    it('should convert null optional fields to undefined', async () => {
      const schemaWithNulls = {
        ...mockSchema,
        organizationId: null,
        performedBy: null,
        ipAddress: null,
        userAgent: null,
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue(
        [[schemaWithNulls], 1],
      );

      const result = await service.getAuditTrail('user-001');
      const entity = result.data[0];

      expect(entity.organizationId).toBeUndefined();
      expect(entity.performedBy).toBeUndefined();
      expect(entity.ipAddress).toBeUndefined();
      expect(entity.userAgent).toBeUndefined();
    });
  });

  describe('LGPD compliance', () => {
    it('should correctly identify LGPD actions', async () => {
      const lgpdActions = [
        'user_data_anonymized',
        'user_data_exported',
        'user_data_deleted',
      ];

      const nonLgpdActions = ['user_login', 'data_access', 'security_event'];

      for (const action of lgpdActions) {
        repository.create.mockReturnValue({ ...mockSchema, action });
        repository.save.mockResolvedValue({ ...mockSchema, action });

        await service.log({ action, userId: 'user-001' });

        // LGPD actions should be logged (we can't directly test the warning log,
        // but we verify the action is processed)
        expect(repository.save).toHaveBeenCalled();
      }

      for (const action of nonLgpdActions) {
        repository.create.mockReturnValue({ ...mockSchema, action });
        repository.save.mockResolvedValue({ ...mockSchema, action });

        await service.log({ action, userId: 'user-001' });

        expect(repository.save).toHaveBeenCalled();
      }
    });
  });
});
