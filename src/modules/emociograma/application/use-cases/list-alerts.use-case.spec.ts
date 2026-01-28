import { Test, TestingModule } from '@nestjs/testing';
import { ListAlertsUseCase } from './list-alerts.use-case';
import type { IEmociogramaAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

describe('ListAlertsUseCase', () => {
  let useCase: ListAlertsUseCase;
  let mockAlertRepository: jest.Mocked<IEmociogramaAlertRepository>;

  const mockAlerts: EmociogramaAlertEntity[] = [
    {
      id: 'alert-1',
      organizationId: 'org-123',
      submissionId: 'sub-1',
      alertType: 'threshold_exceeded',
      severity: 'critical',
      message: 'Critical alert',
      isResolved: false,
      notifiedUsers: [],
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    } as EmociogramaAlertEntity,
    {
      id: 'alert-2',
      organizationId: 'org-123',
      submissionId: 'sub-2',
      alertType: 'threshold_exceeded',
      severity: 'high',
      message: 'High alert',
      isResolved: false,
      notifiedUsers: [],
      createdAt: new Date('2024-01-15T09:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
    } as EmociogramaAlertEntity,
  ];

  beforeEach(async () => {
    mockAlertRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findUnresolved: jest.fn(),
      findByOrganization: jest.fn(),
      findBySubmission: jest.fn(),
      getStatistics: jest.fn(),
      findBySeverity: jest.fn(),
      countUnresolvedBySeverity: jest.fn(),
      findByDateRange: jest.fn(),
      bulkResolve: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAlertsUseCase,
        {
          provide: EMOCIOGRAMA_ALERT_REPOSITORY,
          useValue: mockAlertRepository,
        },
      ],
    }).compile();

    useCase = module.get<ListAlertsUseCase>(ListAlertsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should list alerts with default pagination', async () => {
      mockAlertRepository.findByOrganization.mockResolvedValue({
        data: mockAlerts,
        total: 2,
      });

      const result = await useCase.execute('org-123');

      expect(result.data).toEqual(mockAlerts);
      expect(result.total).toBe(2);
      expect(mockAlertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-123',
        {
          skip: 0,
          take: 20,
          includeResolved: false,
          severity: undefined,
        },
      );
    });

    it('should list alerts with custom pagination', async () => {
      mockAlertRepository.findByOrganization.mockResolvedValue({
        data: [mockAlerts[1]],
        total: 2,
      });

      const result = await useCase.execute('org-123', {
        page: 2,
        limit: 1,
      });

      expect(result.data).toHaveLength(1);
      expect(mockAlertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-123',
        {
          skip: 1,
          take: 1,
          includeResolved: false,
          severity: undefined,
        },
      );
    });

    it('should filter by severity', async () => {
      mockAlertRepository.findByOrganization.mockResolvedValue({
        data: [mockAlerts[0]],
        total: 1,
      });

      const result = await useCase.execute('org-123', {
        severity: 'critical',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].severity).toBe('critical');
      expect(mockAlertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          severity: 'critical',
        }),
      );
    });

    it('should include resolved alerts when requested', async () => {
      mockAlertRepository.findByOrganization.mockResolvedValue({
        data: mockAlerts,
        total: 5,
      });

      await useCase.execute('org-123', {
        includeResolved: true,
      });

      expect(mockAlertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          includeResolved: true,
        }),
      );
    });

    it('should enforce minimum page of 1', async () => {
      mockAlertRepository.findByOrganization.mockResolvedValue({
        data: mockAlerts,
        total: 2,
      });

      await useCase.execute('org-123', { page: -5 });

      expect(mockAlertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          skip: 0,
        }),
      );
    });

    it('should enforce maximum limit of 100', async () => {
      mockAlertRepository.findByOrganization.mockResolvedValue({
        data: mockAlerts,
        total: 2,
      });

      await useCase.execute('org-123', { limit: 500 });

      expect(mockAlertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should return empty array when no alerts exist', async () => {
      mockAlertRepository.findByOrganization.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await useCase.execute('org-123');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
