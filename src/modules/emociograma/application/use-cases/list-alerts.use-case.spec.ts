import { Test, TestingModule } from '@nestjs/testing';
import { ListAlertsUseCase } from './list-alerts.use-case';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type { IEmociogramaAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import type { AlertsQueryDto } from '../dtos/alerts-query.dto';

describe('ListAlertsUseCase', () => {
  let useCase: ListAlertsUseCase;
  let alertRepository: jest.Mocked<IEmociogramaAlertRepository>;

  const mockAlerts = [
    new EmociogramaAlertEntity({
      id: 'alert-001',
      organizationId: 'org-456',
      submissionId: 'sub-001',
      alertType: 'threshold_exceeded',
      severity: 'critical',
      message: 'Critical alert',
      isResolved: false,
      notifiedUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    new EmociogramaAlertEntity({
      id: 'alert-002',
      organizationId: 'org-456',
      submissionId: 'sub-002',
      alertType: 'threshold_exceeded',
      severity: 'high',
      message: 'High severity alert',
      isResolved: false,
      notifiedUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<IEmociogramaAlertRepository>> = {
      findByOrganization: jest.fn(),
      findById: jest.fn(),
      findUnresolved: jest.fn(),
      getStatistics: jest.fn(),
      findBySeverity: jest.fn(),
      countUnresolvedBySeverity: jest.fn(),
      findByDateRange: jest.fn(),
      bulkResolve: jest.fn(),
      findBySubmission: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAlertsUseCase,
        { provide: EMOCIOGRAMA_ALERT_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<ListAlertsUseCase>(ListAlertsUseCase);
    alertRepository = module.get(EMOCIOGRAMA_ALERT_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should list alerts with default pagination', async () => {
      alertRepository.findByOrganization.mockResolvedValue({
        data: mockAlerts,
        total: 2,
      });

      const query: AlertsQueryDto = {};
      const result = await useCase.execute('org-456', query);

      expect(alertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-456',
        {
          skip: 0,
          take: 10,
          includeResolved: undefined,
          severity: undefined,
        },
      );
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should list alerts with custom pagination', async () => {
      alertRepository.findByOrganization.mockResolvedValue({
        data: mockAlerts.slice(0, 1),
        total: 2,
      });

      const query: AlertsQueryDto = { page: 2, limit: 1 };
      const result = await useCase.execute('org-456', query);

      expect(alertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-456',
        {
          skip: 1,
          take: 1,
          includeResolved: undefined,
          severity: undefined,
        },
      );
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by severity', async () => {
      alertRepository.findByOrganization.mockResolvedValue({
        data: [mockAlerts[0]],
        total: 1,
      });

      const query: AlertsQueryDto = { severity: 'critical' };
      const result = await useCase.execute('org-456', query);

      expect(alertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-456',
        expect.objectContaining({ severity: 'critical' }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should include resolved alerts when requested', async () => {
      alertRepository.findByOrganization.mockResolvedValue({
        data: mockAlerts,
        total: 5,
      });

      const query: AlertsQueryDto = { includeResolved: true };
      await useCase.execute('org-456', query);

      expect(alertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-456',
        expect.objectContaining({ includeResolved: true }),
      );
    });

    it('should enforce maximum limit of 100', async () => {
      alertRepository.findByOrganization.mockResolvedValue({
        data: [],
        total: 0,
      });

      const query: AlertsQueryDto = { limit: 500 };
      await useCase.execute('org-456', query);

      expect(alertRepository.findByOrganization).toHaveBeenCalledWith(
        'org-456',
        expect.objectContaining({ take: 100 }),
      );
    });
  });
});
