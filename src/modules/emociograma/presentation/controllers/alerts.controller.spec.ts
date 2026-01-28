import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AlertsController } from './alerts.controller';
import { GetAlertDashboardUseCase } from '../../application/use-cases/get-alert-dashboard.use-case';
import { ResolveAlertUseCase } from '../../application/use-cases/resolve-alert.use-case';
import { ListAlertsUseCase } from '../../application/use-cases/list-alerts.use-case';
import { GetAlertByIdUseCase } from '../../application/use-cases/get-alert-by-id.use-case';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import type { AlertDashboardResponse } from '../../application/use-cases/get-alert-dashboard.use-case';
import type { AlertsQueryDto } from '../../application/dtos/alerts-query.dto';
import type { ResolveAlertDto } from '../../application/dtos/resolve-alert.dto';

describe('AlertsController', () => {
  let controller: AlertsController;
  let getDashboardUseCase: jest.Mocked<GetAlertDashboardUseCase>;
  let resolveAlertUseCase: jest.Mocked<ResolveAlertUseCase>;
  let listAlertsUseCase: jest.Mocked<ListAlertsUseCase>;
  let getAlertByIdUseCase: jest.Mocked<GetAlertByIdUseCase>;

  const organizationId = 'org-456';
  const userId = 'user-123';

  const mockAlert = new EmociogramaAlertEntity({
    id: 'alert-001',
    organizationId,
    submissionId: 'sub-001',
    alertType: 'threshold_exceeded',
    severity: 'high',
    message: 'Test alert',
    isResolved: false,
    notifiedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockDashboard: AlertDashboardResponse = {
    statistics: {
      total: 10,
      unresolved: 5,
      resolvedToday: 2,
      bySeverity: {
        critical: 1,
        high: 2,
        medium: 2,
        low: 0,
      },
    },
    recentAlerts: [mockAlert],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        { provide: GetAlertDashboardUseCase, useValue: { execute: jest.fn() } },
        { provide: ResolveAlertUseCase, useValue: { execute: jest.fn() } },
        { provide: ListAlertsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAlertByIdUseCase, useValue: { execute: jest.fn() } },
        Reflector,
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AlertsController>(AlertsController);
    getDashboardUseCase = module.get(GetAlertDashboardUseCase);
    resolveAlertUseCase = module.get(ResolveAlertUseCase);
    listAlertsUseCase = module.get(ListAlertsUseCase);
    getAlertByIdUseCase = module.get(GetAlertByIdUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return dashboard successfully', async () => {
      getDashboardUseCase.execute.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard(organizationId);

      expect(getDashboardUseCase.execute).toHaveBeenCalledWith(organizationId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDashboard);
    });

    it('should throw BadRequestException when organizationId is missing', async () => {
      await expect(controller.getDashboard('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listAlerts', () => {
    it('should return paginated alerts', async () => {
      const mockResult = {
        data: [mockAlert],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      listAlertsUseCase.execute.mockResolvedValue(mockResult);

      const query: AlertsQueryDto = { page: 1, limit: 10 };
      const result = await controller.listAlerts(organizationId, query);

      expect(listAlertsUseCase.execute).toHaveBeenCalledWith(
        organizationId,
        query,
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockAlert]);
      expect(result.meta?.total).toBe(1);
    });

    it('should throw BadRequestException when organizationId is missing', async () => {
      const query: AlertsQueryDto = {};

      await expect(controller.listAlerts('', query)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAlertById', () => {
    it('should return alert by id', async () => {
      getAlertByIdUseCase.execute.mockResolvedValue(mockAlert);

      const result = await controller.getAlertById('alert-001', organizationId);

      expect(getAlertByIdUseCase.execute).toHaveBeenCalledWith(
        'alert-001',
        organizationId,
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAlert);
    });

    it('should throw BadRequestException when organizationId is missing', async () => {
      await expect(controller.getAlertById('alert-001', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      const resolvedAlert = new EmociogramaAlertEntity({
        ...mockAlert,
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolutionNotes: 'Test notes',
      });
      resolveAlertUseCase.execute.mockResolvedValue(resolvedAlert);

      const dto: ResolveAlertDto = { notes: 'Test notes' };
      const result = await controller.resolveAlert(
        'alert-001',
        dto,
        userId,
        organizationId,
      );

      expect(resolveAlertUseCase.execute).toHaveBeenCalledWith(
        'alert-001',
        userId,
        'Test notes',
      );
      expect(result.success).toBe(true);
      expect(result.data?.isResolved).toBe(true);
    });

    it('should resolve alert without notes', async () => {
      const resolvedAlert = new EmociogramaAlertEntity({
        ...mockAlert,
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      });
      resolveAlertUseCase.execute.mockResolvedValue(resolvedAlert);

      const dto: ResolveAlertDto = {};
      const result = await controller.resolveAlert(
        'alert-001',
        dto,
        userId,
        organizationId,
      );

      expect(resolveAlertUseCase.execute).toHaveBeenCalledWith(
        'alert-001',
        userId,
        undefined,
      );
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when organizationId is missing', async () => {
      const dto: ResolveAlertDto = {};

      await expect(
        controller.resolveAlert('alert-001', dto, userId, ''),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
