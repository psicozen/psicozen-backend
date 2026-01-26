import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetAlertDashboardUseCase } from './get-alert-dashboard.use-case';
import type {
  IEmociogramaAlertRepository,
  AlertStatistics,
} from '../../domain/repositories/alert.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import type { AlertSeverity } from '../../domain/entities/alert.entity';

describe('GetAlertDashboardUseCase', () => {
  let useCase: GetAlertDashboardUseCase;
  let alertRepository: jest.Mocked<IEmociogramaAlertRepository>;

  const organizationId = 'org-123';

  const createMockAlert = (
    overrides: Partial<EmociogramaAlertEntity> = {},
  ): EmociogramaAlertEntity => {
    return new EmociogramaAlertEntity({
      id: `alert-${Math.random().toString(36).substring(7)}`,
      organizationId,
      submissionId: 'sub-123',
      alertType: 'threshold_exceeded',
      severity: 'high',
      message: 'Test alert message',
      isResolved: false,
      notifiedUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  const createMockStatistics = (
    overrides: Partial<AlertStatistics> = {},
  ): AlertStatistics => ({
    total: 50,
    bySeverity: {
      critical: 5,
      high: 15,
      medium: 20,
      low: 10,
    },
    unresolved: 25,
    resolvedToday: 8,
    ...overrides,
  });

  beforeEach(async () => {
    // Suppress logs during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    const mockAlertRepository: Partial<jest.Mocked<IEmociogramaAlertRepository>> = {
      getStatistics: jest.fn(),
      findUnresolved: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findByOrganization: jest.fn(),
      findBySubmission: jest.fn(),
      findBySeverity: jest.fn(),
      countUnresolvedBySeverity: jest.fn(),
      findByDateRange: jest.fn(),
      bulkResolve: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAlertDashboardUseCase,
        {
          provide: EMOCIOGRAMA_ALERT_REPOSITORY,
          useValue: mockAlertRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAlertDashboardUseCase>(GetAlertDashboardUseCase);
    alertRepository = module.get(EMOCIOGRAMA_ALERT_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return dashboard data with statistics and recent alerts', async () => {
      const mockStatistics = createMockStatistics();
      const mockAlerts = [
        createMockAlert({ severity: 'critical' }),
        createMockAlert({ severity: 'high' }),
        createMockAlert({ severity: 'medium' }),
      ];

      alertRepository.getStatistics.mockResolvedValue(mockStatistics);
      alertRepository.findUnresolved.mockResolvedValue(mockAlerts);

      const result = await useCase.execute(organizationId);

      expect(result).toBeDefined();
      expect(result.statistics.total).toBe(50);
      expect(result.statistics.unresolved).toBe(25);
      expect(result.statistics.resolvedToday).toBe(8);
      expect(result.statistics.bySeverity.critical).toBe(5);
      expect(result.statistics.bySeverity.high).toBe(15);
      expect(result.recentAlerts).toHaveLength(3);
    });

    it('should call repository methods with correct organizationId', async () => {
      alertRepository.getStatistics.mockResolvedValue(createMockStatistics());
      alertRepository.findUnresolved.mockResolvedValue([]);

      await useCase.execute(organizationId);

      expect(alertRepository.getStatistics).toHaveBeenCalledWith(organizationId);
      expect(alertRepository.findUnresolved).toHaveBeenCalledWith(organizationId);
    });

    it('should execute repository calls in parallel', async () => {
      const statsPromise = new Promise<AlertStatistics>((resolve) => {
        setTimeout(() => resolve(createMockStatistics()), 10);
      });
      const alertsPromise = new Promise<EmociogramaAlertEntity[]>((resolve) => {
        setTimeout(() => resolve([]), 10);
      });

      alertRepository.getStatistics.mockReturnValue(statsPromise);
      alertRepository.findUnresolved.mockReturnValue(alertsPromise);

      const startTime = Date.now();
      await useCase.execute(organizationId);
      const elapsed = Date.now() - startTime;

      // If sequential, would take ~20ms. Parallel should be ~10ms
      expect(elapsed).toBeLessThan(20);
    });

    describe('recent alerts limit', () => {
      it('should limit recent alerts to 10', async () => {
        const mockAlerts = Array.from({ length: 15 }, () => createMockAlert());

        alertRepository.getStatistics.mockResolvedValue(createMockStatistics());
        alertRepository.findUnresolved.mockResolvedValue(mockAlerts);

        const result = await useCase.execute(organizationId);

        expect(result.recentAlerts).toHaveLength(10);
      });

      it('should return all alerts if less than 10', async () => {
        const mockAlerts = Array.from({ length: 5 }, () => createMockAlert());

        alertRepository.getStatistics.mockResolvedValue(createMockStatistics());
        alertRepository.findUnresolved.mockResolvedValue(mockAlerts);

        const result = await useCase.execute(organizationId);

        expect(result.recentAlerts).toHaveLength(5);
      });

      it('should return empty array when no unresolved alerts', async () => {
        alertRepository.getStatistics.mockResolvedValue(createMockStatistics());
        alertRepository.findUnresolved.mockResolvedValue([]);

        const result = await useCase.execute(organizationId);

        expect(result.recentAlerts).toEqual([]);
      });
    });

    describe('statistics mapping', () => {
      it('should map all statistics fields correctly', async () => {
        const mockStatistics: AlertStatistics = {
          total: 100,
          bySeverity: {
            critical: 10,
            high: 25,
            medium: 40,
            low: 25,
          },
          unresolved: 50,
          resolvedToday: 15,
        };

        alertRepository.getStatistics.mockResolvedValue(mockStatistics);
        alertRepository.findUnresolved.mockResolvedValue([]);

        const result = await useCase.execute(organizationId);

        expect(result.statistics).toEqual({
          total: 100,
          unresolved: 50,
          resolvedToday: 15,
          bySeverity: {
            critical: 10,
            high: 25,
            medium: 40,
            low: 25,
          },
        });
      });

      it('should handle zero statistics', async () => {
        const emptyStatistics: AlertStatistics = {
          total: 0,
          bySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          unresolved: 0,
          resolvedToday: 0,
        };

        alertRepository.getStatistics.mockResolvedValue(emptyStatistics);
        alertRepository.findUnresolved.mockResolvedValue([]);

        const result = await useCase.execute(organizationId);

        expect(result.statistics.total).toBe(0);
        expect(result.statistics.unresolved).toBe(0);
        expect(result.statistics.resolvedToday).toBe(0);
        expect(result.statistics.bySeverity.critical).toBe(0);
        expect(result.statistics.bySeverity.high).toBe(0);
        expect(result.statistics.bySeverity.medium).toBe(0);
        expect(result.statistics.bySeverity.low).toBe(0);
      });
    });

    describe('alerts ordering', () => {
      it('should preserve severity ordering from repository (critical first)', async () => {
        const mockAlerts = [
          createMockAlert({ id: 'alert-1', severity: 'critical' }),
          createMockAlert({ id: 'alert-2', severity: 'high' }),
          createMockAlert({ id: 'alert-3', severity: 'medium' }),
          createMockAlert({ id: 'alert-4', severity: 'low' }),
        ];

        alertRepository.getStatistics.mockResolvedValue(createMockStatistics());
        alertRepository.findUnresolved.mockResolvedValue(mockAlerts);

        const result = await useCase.execute(organizationId);

        expect(result.recentAlerts[0].severity).toBe('critical');
        expect(result.recentAlerts[1].severity).toBe('high');
        expect(result.recentAlerts[2].severity).toBe('medium');
        expect(result.recentAlerts[3].severity).toBe('low');
      });
    });

    describe('logging', () => {
      it('should log dashboard generation', async () => {
        alertRepository.getStatistics.mockResolvedValue(createMockStatistics());
        alertRepository.findUnresolved.mockResolvedValue([]);

        await useCase.execute(organizationId);

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Obtendo dashboard de alertas'),
        );
        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Dashboard gerado'),
        );
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle organization with only critical alerts', async () => {
      const mockStatistics: AlertStatistics = {
        total: 5,
        bySeverity: {
          critical: 5,
          high: 0,
          medium: 0,
          low: 0,
        },
        unresolved: 5,
        resolvedToday: 0,
      };

      const criticalAlerts = Array.from({ length: 5 }, () =>
        createMockAlert({ severity: 'critical' }),
      );

      alertRepository.getStatistics.mockResolvedValue(mockStatistics);
      alertRepository.findUnresolved.mockResolvedValue(criticalAlerts);

      const result = await useCase.execute(organizationId);

      expect(result.statistics.bySeverity.critical).toBe(5);
      expect(result.recentAlerts.every((a) => a.severity === 'critical')).toBe(
        true,
      );
    });

    it('should handle high-volume organization', async () => {
      const mockStatistics: AlertStatistics = {
        total: 10000,
        bySeverity: {
          critical: 500,
          high: 2000,
          medium: 5000,
          low: 2500,
        },
        unresolved: 3000,
        resolvedToday: 200,
      };

      const manyAlerts = Array.from({ length: 100 }, () => createMockAlert());

      alertRepository.getStatistics.mockResolvedValue(mockStatistics);
      alertRepository.findUnresolved.mockResolvedValue(manyAlerts);

      const result = await useCase.execute(organizationId);

      expect(result.statistics.total).toBe(10000);
      expect(result.recentAlerts).toHaveLength(10); // Limited to max
    });
  });
});
