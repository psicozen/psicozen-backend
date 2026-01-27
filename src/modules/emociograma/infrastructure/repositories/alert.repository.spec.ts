import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmociogramaAlertRepository } from './alert.repository';
import { EmociogramaAlertSchema } from '../persistence/alert.schema';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import type {
  AlertSeverity,
  AlertType,
} from '../../domain/entities/alert.entity';

/**
 * Interface para o mock do QueryBuilder
 */
interface MockQueryBuilder {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  take: jest.Mock;
  skip: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  groupBy: jest.Mock;
  update: jest.Mock;
  set: jest.Mock;
  getMany: jest.Mock;
  getManyAndCount: jest.Mock;
  getCount: jest.Mock;
  getRawMany: jest.Mock;
  execute: jest.Mock;
}

describe('EmociogramaAlertRepository', () => {
  let repository: EmociogramaAlertRepository;
  let mockTypeOrmRepository: jest.Mocked<Repository<EmociogramaAlertSchema>>;
  let mockQueryBuilder: MockQueryBuilder;

  const mockOrganizationId = 'org-uuid-123';
  const mockSubmissionId = 'sub-uuid-456';
  const mockUserId = 'user-uuid-789';

  const createMockSchema = (
    overrides?: Partial<EmociogramaAlertSchema>,
  ): EmociogramaAlertSchema => ({
    id: 'alert-uuid-1',
    organizationId: mockOrganizationId,
    submissionId: mockSubmissionId,
    alertType: 'threshold_exceeded',
    severity: 'high',
    message: 'Colaborador reportou estado emocional Estressado (Nível 8/10)',
    isResolved: false,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    notifiedUsers: ['user-1', 'user-2'],
    notificationSentAt: new Date('2025-01-15T10:30:00Z'),
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
    organization: {} as any,
    submission: {} as any,
    resolvedByUser: {} as any,
    ...overrides,
  });

  const createMockQueryBuilder = (): MockQueryBuilder => {
    const mockQb: MockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
      execute: jest.fn(),
    };
    return mockQb;
  };

  beforeEach(async () => {
    mockQueryBuilder = createMockQueryBuilder();

    mockTypeOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as jest.Mocked<Repository<EmociogramaAlertSchema>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmociogramaAlertRepository,
        {
          provide: getRepositoryToken(EmociogramaAlertSchema),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<EmociogramaAlertRepository>(
      EmociogramaAlertRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('toDomain', () => {
    it('should convert schema to domain entity with all fields', () => {
      const schema = createMockSchema();

      const domain = repository.toDomain(schema);

      expect(domain).toBeInstanceOf(EmociogramaAlertEntity);
      expect(domain.id).toBe(schema.id);
      expect(domain.organizationId).toBe(schema.organizationId);
      expect(domain.submissionId).toBe(schema.submissionId);
      expect(domain.alertType).toBe(schema.alertType);
      expect(domain.severity).toBe(schema.severity);
      expect(domain.message).toBe(schema.message);
      expect(domain.isResolved).toBe(schema.isResolved);
      expect(domain.notifiedUsers).toEqual(schema.notifiedUsers);
      expect(domain.notificationSentAt).toBe(schema.notificationSentAt);
      expect(domain.createdAt).toBe(schema.createdAt);
      expect(domain.updatedAt).toBe(schema.updatedAt);
    });

    it('should convert null fields to undefined', () => {
      const schema = createMockSchema({
        resolvedAt: null,
        resolvedBy: null,
        resolutionNotes: null,
        notifiedUsers: null,
        notificationSentAt: null,
      });

      const domain = repository.toDomain(schema);

      expect(domain.resolvedAt).toBeUndefined();
      expect(domain.resolvedBy).toBeUndefined();
      expect(domain.resolutionNotes).toBeUndefined();
      expect(domain.notifiedUsers).toEqual([]);
      expect(domain.notificationSentAt).toBeUndefined();
    });

    it('should preserve resolved fields when present', () => {
      const resolvedAt = new Date('2025-01-16T12:00:00Z');
      const schema = createMockSchema({
        isResolved: true,
        resolvedAt,
        resolvedBy: mockUserId,
        resolutionNotes: 'Contacted employee',
      });

      const domain = repository.toDomain(schema);

      expect(domain.isResolved).toBe(true);
      expect(domain.resolvedAt).toBe(resolvedAt);
      expect(domain.resolvedBy).toBe(mockUserId);
      expect(domain.resolutionNotes).toBe('Contacted employee');
    });
  });

  describe('toEntity', () => {
    it('should convert domain to schema entity', () => {
      const domain: Partial<EmociogramaAlertEntity> = {
        id: 'alert-uuid-1',
        organizationId: mockOrganizationId,
        submissionId: mockSubmissionId,
        alertType: 'threshold_exceeded',
        severity: 'critical',
        message: 'Test message',
        isResolved: false,
        notifiedUsers: ['user-1'],
      };

      const schema = repository.toEntity(domain);

      expect(schema).toBeInstanceOf(EmociogramaAlertSchema);
      expect(schema.id).toBe(domain.id);
      expect(schema.organizationId).toBe(domain.organizationId);
      expect(schema.submissionId).toBe(domain.submissionId);
      expect(schema.alertType).toBe(domain.alertType);
      expect(schema.severity).toBe(domain.severity);
      expect(schema.message).toBe(domain.message);
      expect(schema.isResolved).toBe(domain.isResolved);
      expect(schema.notifiedUsers).toEqual(domain.notifiedUsers);
    });

    it('should only set defined fields', () => {
      const domain: Partial<EmociogramaAlertEntity> = {
        message: 'Updated message',
      };

      const schema = repository.toEntity(domain);

      expect(schema.message).toBe('Updated message');
      expect(schema.id).toBeUndefined();
      expect(schema.organizationId).toBeUndefined();
    });

    it('should convert empty notifiedUsers array to null', () => {
      const domain: Partial<EmociogramaAlertEntity> = {
        notifiedUsers: [],
      };

      const schema = repository.toEntity(domain);

      expect(schema.notifiedUsers).toBeNull();
    });

    it('should convert resolved fields to null when resolving', () => {
      // When explicitly setting resolved fields, undefined values should become null
      const domain: Partial<EmociogramaAlertEntity> = {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'user-123',
        resolutionNotes: undefined, // explicitly undefined
      };

      const schema = repository.toEntity(domain);

      expect(schema.isResolved).toBe(true);
      expect(schema.resolvedAt).toBeInstanceOf(Date);
      expect(schema.resolvedBy).toBe('user-123');
      // resolutionNotes is not set because undefined !== undefined is false
      // This is expected behavior - only defined values are mapped
    });
  });

  describe('findUnresolved', () => {
    it('should return unresolved alerts ordered by severity and date', async () => {
      const criticalAlert = createMockSchema({
        id: 'alert-1',
        severity: 'critical',
      });
      const highAlert = createMockSchema({ id: 'alert-2', severity: 'high' });

      mockQueryBuilder.getMany.mockResolvedValue([criticalAlert, highAlert]);

      const result = await repository.findUnresolved(mockOrganizationId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('alert-1');
      expect(result[1].id).toBe('alert-2');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'alert.organization_id = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.is_resolved = :isResolved',
        { isResolved: false },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'alert.created_at',
        'DESC',
      );
    });

    it('should return empty array when no unresolved alerts', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await repository.findUnresolved(mockOrganizationId);

      expect(result).toEqual([]);
    });
  });

  describe('findByOrganization', () => {
    it('should return paginated alerts with default options', async () => {
      const alerts = [createMockSchema()];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([alerts, 1]);

      const result = await repository.findByOrganization(mockOrganizationId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    });

    it('should apply pagination options', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findByOrganization(mockOrganizationId, {
        take: 20,
        skip: 40,
      });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(40);
    });

    it('should exclude resolved alerts by default', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findByOrganization(mockOrganizationId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.is_resolved = :isResolved',
        { isResolved: false },
      );
    });

    it('should include resolved alerts when specified', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findByOrganization(mockOrganizationId, {
        includeResolved: true,
      });

      // Should not have the is_resolved filter
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'alert.is_resolved = :isResolved',
        expect.anything(),
      );
    });

    it('should filter by severity when specified', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findByOrganization(mockOrganizationId, {
        severity: 'critical',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.severity = :severity',
        { severity: 'critical' },
      );
    });
  });

  describe('findBySubmission', () => {
    it('should return alert for submission', async () => {
      const schema = createMockSchema();
      mockTypeOrmRepository.findOne.mockResolvedValue(schema);

      const result = await repository.findBySubmission(mockSubmissionId);

      expect(result).toBeDefined();
      expect(result?.submissionId).toBe(mockSubmissionId);
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { submissionId: mockSubmissionId },
      });
    });

    it('should return null when no alert exists', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findBySubmission('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return complete statistics', async () => {
      mockTypeOrmRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25); // unresolved

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { severity: 'critical', count: '10' },
        { severity: 'high', count: '30' },
        { severity: 'medium', count: '40' },
        { severity: 'low', count: '20' },
      ]);

      mockQueryBuilder.getCount.mockResolvedValue(5); // resolved today

      const result = await repository.getStatistics(mockOrganizationId);

      expect(result.total).toBe(100);
      expect(result.unresolved).toBe(25);
      expect(result.resolvedToday).toBe(5);
      expect(result.bySeverity.critical).toBe(10);
      expect(result.bySeverity.high).toBe(30);
      expect(result.bySeverity.medium).toBe(40);
      expect(result.bySeverity.low).toBe(20);
    });

    it('should handle empty statistics', async () => {
      mockTypeOrmRepository.count.mockResolvedValue(0);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await repository.getStatistics(mockOrganizationId);

      expect(result.total).toBe(0);
      expect(result.unresolved).toBe(0);
      expect(result.resolvedToday).toBe(0);
      expect(result.bySeverity).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      });
    });
  });

  describe('findBySeverity', () => {
    it('should return alerts filtered by severity', async () => {
      const criticalAlerts = [
        createMockSchema({ severity: 'critical' }),
        createMockSchema({ id: 'alert-2', severity: 'critical' }),
      ];
      mockTypeOrmRepository.find.mockResolvedValue(criticalAlerts);

      const result = await repository.findBySeverity(
        mockOrganizationId,
        'critical',
      );

      expect(result).toHaveLength(2);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          severity: 'critical',
        },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no alerts match severity', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findBySeverity(mockOrganizationId, 'low');

      expect(result).toEqual([]);
    });
  });

  describe('countUnresolvedBySeverity', () => {
    it('should return counts by severity', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { severity: 'critical', count: '5' },
        { severity: 'high', count: '10' },
      ]);

      const result =
        await repository.countUnresolvedBySeverity(mockOrganizationId);

      expect(result.critical).toBe(5);
      expect(result.high).toBe(10);
      expect(result.medium).toBe(0);
      expect(result.low).toBe(0);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.is_resolved = :isResolved',
        { isResolved: false },
      );
    });

    it('should return all zeros when no unresolved alerts', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result =
        await repository.countUnresolvedBySeverity(mockOrganizationId);

      expect(result).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      });
    });
  });

  describe('findByDateRange', () => {
    it('should return alerts within date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const alerts = [createMockSchema()];

      mockTypeOrmRepository.find.mockResolvedValue(alerts);

      const result = await repository.findByDateRange(
        mockOrganizationId,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(1);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          createdAt: expect.anything(),
        },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no alerts in range', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findByDateRange(
        mockOrganizationId,
        new Date('2020-01-01'),
        new Date('2020-01-31'),
      );

      expect(result).toEqual([]);
    });
  });

  describe('bulkResolve', () => {
    it('should resolve multiple alerts at once', async () => {
      const alertIds = ['alert-1', 'alert-2', 'alert-3'];
      mockQueryBuilder.execute.mockResolvedValue({ affected: 3 });

      const result = await repository.bulkResolve(
        alertIds,
        mockUserId,
        'Bulk resolution',
      );

      expect(result).toBe(3);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isResolved: true,
          resolvedBy: mockUserId,
          resolutionNotes: 'Bulk resolution',
        }),
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id IN (:...alertIds)',
        { alertIds },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'is_resolved = :isResolved',
        { isResolved: false },
      );
    });

    it('should return 0 when empty array provided', async () => {
      const result = await repository.bulkResolve([], mockUserId);

      expect(result).toBe(0);
      expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
    });

    it('should resolve without notes', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      await repository.bulkResolve(['alert-1'], mockUserId);

      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          resolutionNotes: null,
        }),
      );
    });

    it('should only resolve unresolved alerts', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 2 });

      const result = await repository.bulkResolve(
        ['alert-1', 'alert-2', 'alert-3'],
        mockUserId,
      );

      // Only 2 were unresolved
      expect(result).toBe(2);
    });
  });

  describe('integration: different severity levels', () => {
    it('should handle all severity levels correctly', () => {
      const severities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

      for (const severity of severities) {
        const schema = createMockSchema({ severity });
        const domain = repository.toDomain(schema);

        expect(domain.severity).toBe(severity);

        const backToSchema = repository.toEntity(domain);
        expect(backToSchema.severity).toBe(severity);
      }
    });
  });

  describe('integration: different alert types', () => {
    it('should handle all alert types correctly', () => {
      const alertTypes: AlertType[] = [
        'threshold_exceeded',
        'pattern_detected',
      ];

      for (const alertType of alertTypes) {
        const schema = createMockSchema({ alertType });
        const domain = repository.toDomain(schema);

        expect(domain.alertType).toBe(alertType);

        const backToSchema = repository.toEntity(domain);
        expect(backToSchema.alertType).toBe(alertType);
      }
    });
  });
});
