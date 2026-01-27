import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmociogramaController } from './emociograma.controller';
import { SubmitEmociogramaUseCase } from '../../application/use-cases/submit-emociograma.use-case';
import { GetMySubmissionsUseCase } from '../../application/use-cases/get-my-submissions.use-case';
import { GetSubmissionByIdUseCase } from '../../application/use-cases/get-submission-by-id.use-case';
import { GetTeamSubmissionsUseCase } from '../../application/use-cases/get-team-submissions.use-case';
import { GetAggregatedReportUseCase } from '../../application/use-cases/get-aggregated-report.use-case';
import { GetAnalyticsUseCase } from '../../application/use-cases/get-analytics.use-case';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { SubmitEmociogramaDto } from '../../application/dtos/submit-emociograma.dto';
import { AggregatedReportDto } from '../../application/dtos/aggregated-report.dto';
import { AnalyticsQueryDto } from '../../application/dtos/analytics-query.dto';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { Role } from '../../../roles/domain/enums/role.enum';
import type { UserPayload } from '../../../../core/presentation/decorators/current-user.decorator';
import type { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';
import type { AggregatedReportResponse } from '../../application/use-cases/get-aggregated-report.use-case';
import type { AnalyticsResponse } from '../../application/use-cases/get-analytics.use-case';

describe('EmociogramaController', () => {
  let controller: EmociogramaController;
  let submitUseCase: jest.Mocked<SubmitEmociogramaUseCase>;
  let getMySubmissionsUseCase: jest.Mocked<GetMySubmissionsUseCase>;
  let getSubmissionByIdUseCase: jest.Mocked<GetSubmissionByIdUseCase>;
  let getTeamSubmissionsUseCase: jest.Mocked<GetTeamSubmissionsUseCase>;
  let getAggregatedReportUseCase: jest.Mocked<GetAggregatedReportUseCase>;
  let getAnalyticsUseCase: jest.Mocked<GetAnalyticsUseCase>;

  const userId = 'user-123';
  const organizationId = 'org-456';

  const mockSubmission = {
    id: 'sub-001',
    organizationId,
    userId,
    emotionLevel: 3,
    emotionEmoji: '😌',
    categoryId: 'cat-789',
    isAnonymous: false,
    submittedAt: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  } as EmociogramaSubmissionEntity;

  const mockUserPayload: UserPayload = {
    id: userId,
    email: 'test@example.com',
    role: Role.COLABORADOR,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmociogramaController],
      providers: [
        { provide: SubmitEmociogramaUseCase, useValue: { execute: jest.fn() } },
        { provide: GetMySubmissionsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetSubmissionByIdUseCase, useValue: { execute: jest.fn() } },
        { provide: GetTeamSubmissionsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAggregatedReportUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAnalyticsUseCase, useValue: { execute: jest.fn() } },
        Reflector,
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmociogramaController>(EmociogramaController);
    submitUseCase = module.get(SubmitEmociogramaUseCase);
    getMySubmissionsUseCase = module.get(GetMySubmissionsUseCase);
    getSubmissionByIdUseCase = module.get(GetSubmissionByIdUseCase);
    getTeamSubmissionsUseCase = module.get(GetTeamSubmissionsUseCase);
    getAggregatedReportUseCase = module.get(GetAggregatedReportUseCase);
    getAnalyticsUseCase = module.get(GetAnalyticsUseCase);
  });

  describe('submit', () => {
    const dto: SubmitEmociogramaDto = {
      emotionLevel: 3,
      categoryId: 'cat-789',
      isAnonymous: false,
    };

    it('deve criar submissão com sucesso', async () => {
      submitUseCase.execute.mockResolvedValue(mockSubmission);

      const result = await controller.submit(dto, userId, organizationId);

      expect(submitUseCase.execute).toHaveBeenCalledWith(dto, userId, organizationId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSubmission);
    });

    it('deve lançar erro quando organizationId não é fornecido', async () => {
      await expect(controller.submit(dto, userId, '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMySubmissions', () => {
    const pagination = new PaginationDto();

    it('deve retornar submissões paginadas', async () => {
      const mockResult: PaginatedResult<EmociogramaSubmissionEntity> = {
        data: [mockSubmission],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      getMySubmissionsUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.getMySubmissions(userId, organizationId, pagination);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockSubmission]);
    });
  });

  describe('getTeamAggregated', () => {
    const query: AggregatedReportDto = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('deve retornar relatório agregado', async () => {
      const mockReport: AggregatedReportResponse = {
        summary: {
          totalSubmissions: 100,
          averageEmotionLevel: 4.5,
          motivationScore: 65,
          anonymityRate: 30,
        },
        trends: {
          direction: 'stable',
          dailyAverages: [],
        },
        distribution: {
          byLevel: [],
          byCategory: [],
        },
        alerts: {
          totalAlertsTriggered: 10,
          criticalCount: 2,
          highCount: 3,
          mediumCount: 5,
        },
      };
      getAggregatedReportUseCase.execute.mockResolvedValue(mockReport);

      const result = await controller.getTeamAggregated(organizationId, query);

      expect(getAggregatedReportUseCase.execute).toHaveBeenCalledWith(query, organizationId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReport);
    });
  });

  describe('getTeamAnonymized', () => {
    const pagination = new PaginationDto();

    it('deve retornar submissões anonimizadas', async () => {
      const mockAnonymized = {
        data: [{ ...mockSubmission, userId: 'anonymous' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      getTeamSubmissionsUseCase.execute.mockResolvedValue(mockAnonymized);

      const result = await controller.getTeamAnonymized(organizationId, pagination, userId);

      expect(getTeamSubmissionsUseCase.execute).toHaveBeenCalledWith(
        organizationId,
        userId,
        pagination,
        true,
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getOrganizationReport', () => {
    const query: AggregatedReportDto = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('deve retornar relatório da organização', async () => {
      const mockReport: AggregatedReportResponse = {
        summary: { totalSubmissions: 500, averageEmotionLevel: 4.2, motivationScore: 68, anonymityRate: 25 },
        trends: { direction: 'improving', dailyAverages: [] },
        distribution: { byLevel: [], byCategory: [] },
        alerts: { totalAlertsTriggered: 50, criticalCount: 10, highCount: 15, mediumCount: 25 },
      };
      getAggregatedReportUseCase.execute.mockResolvedValue(mockReport);

      const result = await controller.getOrganizationReport(organizationId, query);

      expect(result.success).toBe(true);
      expect(result.data?.summary.totalSubmissions).toBe(500);
    });
  });

  describe('getOrganizationAnalytics', () => {
    const query: AnalyticsQueryDto = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      limit: 10,
    };

    it('deve retornar analytics da organização', async () => {
      const mockAnalytics: AnalyticsResponse = {
        period: { startDate: query.startDate, endDate: query.endDate },
        motivation: {
          mostMotivated: [],
          leastMotivated: [],
          overallScore: 72,
        },
        patterns: {
          peakDays: ['2024-01-15', '2024-01-16'],
          lowDays: ['2024-01-10'],
          averageByDayOfWeek: [],
        },
      };
      getAnalyticsUseCase.execute.mockResolvedValue(mockAnalytics);

      const result = await controller.getOrganizationAnalytics(organizationId, query);

      expect(getAnalyticsUseCase.execute).toHaveBeenCalledWith(organizationId, query);
      expect(result.success).toBe(true);
      expect(result.data?.motivation.overallScore).toBe(72);
    });
  });
});
