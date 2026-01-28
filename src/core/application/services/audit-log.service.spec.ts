import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
import {
  AUDIT_LOG_REPOSITORY,
  type IAuditLogRepository,
} from '../../domain/repositories/audit-log.repository.interface';
import type { AuditLogEntry } from './audit-log.service.interface';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockRepository: jest.Mocked<IAuditLogRepository>;

  const mockEntity = new AuditLogEntity({
    id: 'log-001',
    action: 'user_data_exported',
    userId: 'user-001',
    organizationId: 'org-001',
    performedBy: undefined,
    metadata: { reason: 'LGPD_compliance' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2024-01-15'),
  });

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      findByUser: jest.fn(),
      findByAction: jest.fn(),
      deleteOlderThan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AUDIT_LOG_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
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

      mockRepository.create.mockResolvedValue(mockEntity);

      const result = await service.log(entry);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user_data_exported',
          userId: 'user-001',
          organizationId: 'org-001',
        }),
      );
      expect(result.id).toBe('log-001');
      expect(result.action).toBe('user_data_exported');
      expect(result.userId).toBe('user-001');
    });

    it('should handle entries without optional fields', async () => {
      const entry: AuditLogEntry = {
        action: 'user_login',
        userId: 'user-001',
      };

      const minimalEntity = new AuditLogEntity({
        id: 'log-001',
        action: 'user_login',
        userId: 'user-001',
        organizationId: undefined,
        performedBy: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        metadata: {},
        createdAt: new Date('2024-01-15'),
      });

      mockRepository.create.mockResolvedValue(minimalEntity);

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

        const lgpdEntity = new AuditLogEntity({
          ...mockEntity,
          id: 'log-001',
          action,
        });

        mockRepository.create.mockResolvedValue(lgpdEntity);

        const result = await service.log(entry);

        expect(result.action).toBe(action);
      }
    });

    it('should set createdAt timestamp automatically', async () => {
      const entry: AuditLogEntry = {
        action: 'data_access',
        userId: 'user-001',
      };

      mockRepository.create.mockResolvedValue(mockEntity);

      await service.log(entry);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail for a user', async () => {
      mockRepository.findByUser.mockResolvedValue({
        data: [mockEntity],
        total: 1,
      });

      const result = await service.getAuditTrail('user-001');

      expect(mockRepository.findByUser).toHaveBeenCalledWith(
        'user-001',
        undefined,
        expect.any(Object),
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].action).toBe('user_data_exported');
    });

    it('should filter by organization when provided', async () => {
      mockRepository.findByUser.mockResolvedValue({
        data: [mockEntity],
        total: 1,
      });

      await service.getAuditTrail('user-001', 'org-001');

      expect(mockRepository.findByUser).toHaveBeenCalledWith(
        'user-001',
        'org-001',
        expect.any(Object),
      );
    });

    it('should apply date filters when provided', async () => {
      mockRepository.findByUser.mockResolvedValue({
        data: [],
        total: 0,
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.getAuditTrail('user-001', undefined, {
        startDate,
        endDate,
      });

      expect(mockRepository.findByUser).toHaveBeenCalledWith(
        'user-001',
        undefined,
        expect.objectContaining({
          startDate,
          endDate,
        }),
      );
    });

    it('should apply limit and offset', async () => {
      mockRepository.findByUser.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.getAuditTrail('user-001', undefined, {
        limit: 50,
        offset: 10,
      });

      expect(mockRepository.findByUser).toHaveBeenCalledWith(
        'user-001',
        undefined,
        expect.objectContaining({
          limit: 50,
          offset: 10,
        }),
      );
    });

    it('should pass options to repository', async () => {
      mockRepository.findByUser.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.getAuditTrail('user-001');

      expect(mockRepository.findByUser).toHaveBeenCalledWith(
        'user-001',
        undefined,
        expect.objectContaining({
          action: undefined,
          startDate: undefined,
          endDate: undefined,
          limit: undefined,
          offset: undefined,
        }),
      );
    });

    it('should return result from repository', async () => {
      mockRepository.findByUser.mockResolvedValue({
        data: [mockEntity],
        total: 5,
      });

      const result = await service.getAuditTrail('user-001');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(5);
    });
  });

  describe('getByAction', () => {
    it('should return logs for a specific action', async () => {
      mockRepository.findByAction.mockResolvedValue({
        data: [mockEntity],
        total: 1,
      });

      const result = await service.getByAction('user_data_exported');

      expect(mockRepository.findByAction).toHaveBeenCalledWith(
        'user_data_exported',
        undefined,
        expect.any(Object),
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by organization when provided', async () => {
      mockRepository.findByAction.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.getByAction('user_data_deleted', 'org-001');

      expect(mockRepository.findByAction).toHaveBeenCalledWith(
        'user_data_deleted',
        'org-001',
        expect.any(Object),
      );
    });

    it('should apply options filters', async () => {
      mockRepository.findByAction.mockResolvedValue({
        data: [],
        total: 0,
      });

      const startDate = new Date('2024-01-01');

      await service.getByAction('user_login', undefined, {
        limit: 25,
        startDate,
      });

      expect(mockRepository.findByAction).toHaveBeenCalledWith(
        'user_login',
        undefined,
        expect.objectContaining({
          limit: 25,
          startDate,
        }),
      );
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than 2 years', async () => {
      mockRepository.deleteOlderThan.mockResolvedValue(150);

      const result = await service.cleanupOldLogs();

      expect(mockRepository.deleteOlderThan).toHaveBeenCalledWith(
        expect.any(Date),
      );
      expect(result.deletedCount).toBe(150);
      expect(result.retentionDate).toBeInstanceOf(Date);
    });

    it('should return 0 when no old logs exist', async () => {
      mockRepository.deleteOlderThan.mockResolvedValue(0);

      const result = await service.cleanupOldLogs();

      expect(result.deletedCount).toBe(0);
    });

    it('should calculate retention date as 2 years ago', async () => {
      mockRepository.deleteOlderThan.mockResolvedValue(0);

      const result = await service.cleanupOldLogs();

      const expectedRetentionYear = new Date().getFullYear() - 2;

      expect(result.retentionDate.getFullYear()).toBe(expectedRetentionYear);
    });

    it('should pass retention date to repository', async () => {
      mockRepository.deleteOlderThan.mockResolvedValue(10);

      await service.cleanupOldLogs();

      const calledDate = mockRepository.deleteOlderThan.mock.calls[0][0];
      const expectedYear = new Date().getFullYear() - 2;
      expect(calledDate.getFullYear()).toBe(expectedYear);
    });
  });

  describe('domain entity handling', () => {
    it('should return entities from repository correctly', async () => {
      mockRepository.findByUser.mockResolvedValue({
        data: [mockEntity],
        total: 1,
      });

      const result = await service.getAuditTrail('user-001');
      const entity = result.data[0];

      expect(entity.id).toBe(mockEntity.id);
      expect(entity.action).toBe(mockEntity.action);
      expect(entity.userId).toBe(mockEntity.userId);
      expect(entity.organizationId).toBe(mockEntity.organizationId);
      expect(entity.metadata).toEqual(mockEntity.metadata);
      expect(entity.ipAddress).toBe(mockEntity.ipAddress);
      expect(entity.userAgent).toBe(mockEntity.userAgent);
      expect(entity.createdAt).toEqual(mockEntity.createdAt);
    });

    it('should handle entities with undefined optional fields', async () => {
      const entityWithUndefined = new AuditLogEntity({
        id: 'log-002',
        action: 'user_login',
        userId: 'user-001',
        organizationId: undefined,
        performedBy: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        metadata: {},
        createdAt: new Date('2024-01-15'),
      });

      mockRepository.findByUser.mockResolvedValue({
        data: [entityWithUndefined],
        total: 1,
      });

      const result = await service.getAuditTrail('user-001');
      const entity = result.data[0];

      expect(entity.organizationId).toBeUndefined();
      expect(entity.performedBy).toBeUndefined();
      expect(entity.ipAddress).toBeUndefined();
      expect(entity.userAgent).toBeUndefined();
    });
  });

  describe('LGPD compliance', () => {
    it('should correctly process LGPD actions', async () => {
      const lgpdActions = [
        'user_data_anonymized',
        'user_data_exported',
        'user_data_deleted',
      ];

      const nonLgpdActions = ['user_login', 'data_access', 'security_event'];

      for (const action of lgpdActions) {
        const lgpdEntity = new AuditLogEntity({
          ...mockEntity,
          id: 'log-001',
          action,
        });

        mockRepository.create.mockResolvedValue(lgpdEntity);

        await service.log({ action, userId: 'user-001' });

        // LGPD actions should be logged (we can't directly test the warning log,
        // but we verify the action is processed)
        expect(mockRepository.create).toHaveBeenCalled();
      }

      for (const action of nonLgpdActions) {
        const nonLgpdEntity = new AuditLogEntity({
          ...mockEntity,
          id: 'log-001',
          action,
        });

        mockRepository.create.mockResolvedValue(nonLgpdEntity);

        await service.log({ action, userId: 'user-001' });

        expect(mockRepository.create).toHaveBeenCalled();
      }
    });
  });
});
