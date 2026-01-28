import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AlertsController } from './alerts.controller';
import { GetAlertDashboardUseCase } from '../../application/use-cases/get-alert-dashboard.use-case';
import { ResolveAlertUseCase } from '../../application/use-cases/resolve-alert.use-case';
import { ListAlertsUseCase } from '../../application/use-cases/list-alerts.use-case';
import { GetAlertByIdUseCase } from '../../application/use-cases/get-alert-by-id.use-case';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import type { AlertDashboardResponse } from '../../application/use-cases/get-alert-dashboard.use-case';

describe('AlertsController', () => {
  let controller: AlertsController;
  let mockGetDashboardUseCase: jest.Mocked<GetAlertDashboardUseCase>;
  let mockResolveAlertUseCase: jest.Mocked<ResolveAlertUseCase>;
  let mockListAlertsUseCase: jest.Mocked<ListAlertsUseCase>;
  let mockGetAlertByIdUseCase: jest.Mocked<GetAlertByIdUseCase>;

  const mockAlert = {
    id: 'alert-123',
    organizationId: 'org-123',
    submissionId: 'submission-123',
    alertType: 'threshold_exceeded' as const,
    severity: 'high' as const,
    message: 'Test alert message',
    isResolved: false,
    resolvedAt: undefined,
    resolvedBy: undefined,
    resolutionNotes: undefined,
    notifiedUsers: ['user-1'],
    notificationSentAt: new Date('2024-01-15T10:35:00Z'),
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  } as EmociogramaAlertEntity;

  const mockDashboard: AlertDashboardResponse = {
    statistics: {
      total: 10,
      unresolved: 5,
      resolvedToday: 2,
      bySeverity: {
        critical: 1,
        high: 2,
        medium: 1,
        low: 1,
      },
    },
    recentAlerts: [mockAlert],
  };

  beforeEach(async () => {
    mockGetDashboardUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAlertDashboardUseCase>;

    mockResolveAlertUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResolveAlertUseCase>;

    mockListAlertsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListAlertsUseCase>;

    mockGetAlertByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAlertByIdUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: GetAlertDashboardUseCase,
          useValue: mockGetDashboardUseCase,
        },
        { provide: ResolveAlertUseCase, useValue: mockResolveAlertUseCase },
        { provide: ListAlertsUseCase, useValue: mockListAlertsUseCase },
        { provide: GetAlertByIdUseCase, useValue: mockGetAlertByIdUseCase },
        Reflector,
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AlertsController>(AlertsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================
  // getDashboard
  // ===========================

  describe('getDashboard', () => {
    it('should return dashboard data successfully', async () => {
      mockGetDashboardUseCase.execute.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard('org-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDashboard);
      expect(mockGetDashboardUseCase.execute).toHaveBeenCalledWith('org-123');
    });

    it('should throw BadRequestException when organizationId is missing', async () => {
      await expect(controller.getDashboard('')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockGetDashboardUseCase.execute).not.toHaveBeenCalled();
    });
  });

  // ===========================
  // listAlerts
  // ===========================

  describe('listAlerts', () => {
    it('should return paginated alerts', async () => {
      mockListAlertsUseCase.execute.mockResolvedValue({
        data: [mockAlert],
        total: 1,
      });

      const result = await controller.listAlerts('org-123', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockAlert]);
      expect(result.meta?.total).toBe(1);
      expect(mockListAlertsUseCase.execute).toHaveBeenCalledWith('org-123', {
        page: undefined,
        limit: undefined,
        severity: undefined,
        includeResolved: undefined,
      });
    });

    it('should pass query parameters to use case', async () => {
      mockListAlertsUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.listAlerts('org-123', {
        page: 2,
        limit: 10,
        severity: 'high' as any,
        includeResolved: true,
      });

      expect(mockListAlertsUseCase.execute).toHaveBeenCalledWith('org-123', {
        page: 2,
        limit: 10,
        severity: 'high',
        includeResolved: true,
      });
    });

    it('should throw BadRequestException when organizationId is missing', async () => {
      await expect(controller.listAlerts('', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================
  // getAlertById
  // ===========================

  describe('getAlertById', () => {
    it('should return alert by id', async () => {
      mockGetAlertByIdUseCase.execute.mockResolvedValue(mockAlert);

      const result = await controller.getAlertById('alert-123', 'org-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAlert);
      expect(mockGetAlertByIdUseCase.execute).toHaveBeenCalledWith(
        'alert-123',
        'org-123',
      );
    });

    it('should throw BadRequestException when organizationId is missing', async () => {
      await expect(controller.getAlertById('alert-123', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException from use case', async () => {
      mockGetAlertByIdUseCase.execute.mockRejectedValue(
        new NotFoundException('Alerta não encontrado'),
      );

      await expect(
        controller.getAlertById('alert-999', 'org-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from use case', async () => {
      mockGetAlertByIdUseCase.execute.mockRejectedValue(
        new ForbiddenException('Sem permissão'),
      );

      await expect(
        controller.getAlertById('alert-123', 'other-org'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================
  // resolveAlert
  // ===========================

  describe('resolveAlert', () => {
    const resolvedAlert = {
      ...mockAlert,
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy: 'user-123',
      resolutionNotes: 'Conversei com o colaborador',
    } as EmociogramaAlertEntity;

    it('should resolve alert successfully', async () => {
      mockGetAlertByIdUseCase.execute.mockResolvedValue(mockAlert);
      mockResolveAlertUseCase.execute.mockResolvedValue(resolvedAlert);

      const result = await controller.resolveAlert(
        'alert-123',
        { notes: 'Conversei com o colaborador' },
        'user-123',
        'org-123',
      );

      expect(result.success).toBe(true);
      expect(result.data?.isResolved).toBe(true);
      expect(mockGetAlertByIdUseCase.execute).toHaveBeenCalledWith(
        'alert-123',
        'org-123',
      );
      expect(mockResolveAlertUseCase.execute).toHaveBeenCalledWith(
        'alert-123',
        'user-123',
        'Conversei com o colaborador',
      );
    });

    it('should resolve alert without notes', async () => {
      mockGetAlertByIdUseCase.execute.mockResolvedValue(mockAlert);
      mockResolveAlertUseCase.execute.mockResolvedValue({
        ...resolvedAlert,
        resolutionNotes: undefined,
      } as EmociogramaAlertEntity);

      const result = await controller.resolveAlert(
        'alert-123',
        {},
        'user-123',
        'org-123',
      );

      expect(result.success).toBe(true);
      expect(mockResolveAlertUseCase.execute).toHaveBeenCalledWith(
        'alert-123',
        'user-123',
        undefined,
      );
    });

    it('should throw BadRequestException when organizationId is missing', async () => {
      await expect(
        controller.resolveAlert('alert-123', {}, 'user-123', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when alert belongs to different organization', async () => {
      mockGetAlertByIdUseCase.execute.mockRejectedValue(
        new ForbiddenException('Sem permissão'),
      );

      await expect(
        controller.resolveAlert('alert-123', {}, 'user-123', 'other-org'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockResolveAlertUseCase.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when alert does not exist', async () => {
      mockGetAlertByIdUseCase.execute.mockRejectedValue(
        new NotFoundException('Alerta não encontrado'),
      );

      await expect(
        controller.resolveAlert('alert-999', {}, 'user-123', 'org-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when alert is already resolved', async () => {
      mockGetAlertByIdUseCase.execute.mockResolvedValue(mockAlert);
      mockResolveAlertUseCase.execute.mockRejectedValue(
        new ConflictException('Alerta já foi resolvido'),
      );

      await expect(
        controller.resolveAlert('alert-123', {}, 'user-123', 'org-123'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
