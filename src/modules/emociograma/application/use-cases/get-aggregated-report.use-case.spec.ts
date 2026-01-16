import { Test, TestingModule } from '@nestjs/testing';
import { GetAggregatedReportUseCase } from './get-aggregated-report.use-case';
import {
  IEmociogramaSubmissionRepository,
  EMOCIOGRAMA_SUBMISSION_REPOSITORY,
  AggregatedData,
  TrendDataPoint,
} from '../../domain/repositories/submission.repository.interface';
import { AggregatedReportDto } from '../dtos/aggregated-report.dto';

describe('GetAggregatedReportUseCase', () => {
  let useCase: GetAggregatedReportUseCase;
  let submissionRepository: jest.Mocked<IEmociogramaSubmissionRepository>;

  // Mock data
  const organizationId = 'org-456';
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');

  const createMockAggregatedData = (
    overrides: Partial<AggregatedData> = {},
  ): AggregatedData => ({
    totalSubmissions: 100,
    averageEmotionLevel: 4.5,
    distributionByLevel: {
      1: 10,
      2: 15,
      3: 20,
      4: 15,
      5: 10,
      6: 10,
      7: 8,
      8: 7,
      9: 3,
      10: 2,
    },
    distributionByCategory: {
      'cat-work': 40,
      'cat-personal': 35,
      'cat-health': 25,
    },
    anonymousCount: 30,
    identifiedCount: 70,
    trendData: [
      { date: '2024-01-01', avgLevel: 5.0 },
      { date: '2024-01-08', avgLevel: 4.8 },
      { date: '2024-01-15', avgLevel: 4.5 },
      { date: '2024-01-22', avgLevel: 4.2 },
      { date: '2024-01-29', avgLevel: 4.0 },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    const mockSubmissionRepository: Partial<
      jest.Mocked<IEmociogramaSubmissionRepository>
    > = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findByUser: jest.fn(),
      getAggregatedByTimeRange: jest.fn(),
      findSubmissionsAboveThreshold: jest.fn(),
      getMostMotivated: jest.fn(),
      getLeastMotivated: jest.fn(),
      getByDepartment: jest.fn(),
      getByTeam: jest.fn(),
      deleteByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAggregatedReportUseCase,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockSubmissionRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAggregatedReportUseCase>(
      GetAggregatedReportUseCase,
    );
    submissionRepository = module.get(EMOCIOGRAMA_SUBMISSION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const validDto: AggregatedReportDto = {
      startDate,
      endDate,
    };

    it('should generate aggregated report successfully', async () => {
      const mockData = createMockAggregatedData();
      submissionRepository.getAggregatedByTimeRange.mockResolvedValue(mockData);

      const result = await useCase.execute(validDto, organizationId);

      expect(result).toBeDefined();
      expect(result.summary.totalSubmissions).toBe(100);
      expect(result.summary.averageEmotionLevel).toBe(4.5);
      expect(
        submissionRepository.getAggregatedByTimeRange,
      ).toHaveBeenCalledWith(organizationId, startDate, endDate, {
        department: undefined,
        team: undefined,
        categoryId: undefined,
      });
    });

    it('should pass filters to repository correctly', async () => {
      const dtoWithFilters: AggregatedReportDto = {
        startDate,
        endDate,
        department: 'Engineering',
        team: 'Backend',
        categoryId: 'cat-123',
      };
      const mockData = createMockAggregatedData();
      submissionRepository.getAggregatedByTimeRange.mockResolvedValue(mockData);

      await useCase.execute(dtoWithFilters, organizationId);

      expect(
        submissionRepository.getAggregatedByTimeRange,
      ).toHaveBeenCalledWith(organizationId, startDate, endDate, {
        department: 'Engineering',
        team: 'Backend',
        categoryId: 'cat-123',
      });
    });

    describe('summary calculations', () => {
      it('should calculate motivation score correctly (inverted scale)', async () => {
        // Average emotion level 1 -> 100% motivation
        const mockData = createMockAggregatedData({ averageEmotionLevel: 1 });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.summary.motivationScore).toBe(100);
      });

      it('should calculate motivation score for level 10 as 0%', async () => {
        const mockData = createMockAggregatedData({ averageEmotionLevel: 10 });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.summary.motivationScore).toBe(10); // (11-10)/10*100 = 10
      });

      it('should calculate motivation score for mid-level emotions', async () => {
        // Average emotion level 5.5 -> (11-5.5)/10*100 = 55%
        const mockData = createMockAggregatedData({ averageEmotionLevel: 5.5 });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.summary.motivationScore).toBe(55);
      });

      it('should handle zero average emotion level', async () => {
        const mockData = createMockAggregatedData({ averageEmotionLevel: 0 });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.summary.motivationScore).toBe(0);
      });

      it('should calculate anonymity rate correctly', async () => {
        const mockData = createMockAggregatedData({
          totalSubmissions: 100,
          anonymousCount: 30,
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.summary.anonymityRate).toBe(30);
      });

      it('should handle zero submissions without division error', async () => {
        const mockData = createMockAggregatedData({
          totalSubmissions: 0,
          anonymousCount: 0,
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.summary.anonymityRate).toBe(0);
        expect(result.summary.totalSubmissions).toBe(0);
      });
    });

    describe('trend calculations', () => {
      it('should detect improving trend (decreasing emotion levels)', async () => {
        const improvingTrend: TrendDataPoint[] = [
          { date: '2024-01-01', avgLevel: 7.0 },
          { date: '2024-01-08', avgLevel: 6.5 },
          { date: '2024-01-15', avgLevel: 6.0 },
          { date: '2024-01-22', avgLevel: 5.0 },
          { date: '2024-01-29', avgLevel: 4.5 },
        ];
        const mockData = createMockAggregatedData({
          trendData: improvingTrend,
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.trends.direction).toBe('improving');
      });

      it('should detect declining trend (increasing emotion levels)', async () => {
        const decliningTrend: TrendDataPoint[] = [
          { date: '2024-01-01', avgLevel: 3.0 },
          { date: '2024-01-08', avgLevel: 3.5 },
          { date: '2024-01-15', avgLevel: 4.0 },
          { date: '2024-01-22', avgLevel: 5.0 },
          { date: '2024-01-29', avgLevel: 6.0 },
        ];
        const mockData = createMockAggregatedData({
          trendData: decliningTrend,
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.trends.direction).toBe('declining');
      });

      it('should detect stable trend (minimal change)', async () => {
        const stableTrend: TrendDataPoint[] = [
          { date: '2024-01-01', avgLevel: 4.0 },
          { date: '2024-01-08', avgLevel: 4.1 },
          { date: '2024-01-15', avgLevel: 3.9 },
          { date: '2024-01-22', avgLevel: 4.2 },
          { date: '2024-01-29', avgLevel: 4.0 },
        ];
        const mockData = createMockAggregatedData({ trendData: stableTrend });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.trends.direction).toBe('stable');
      });

      it('should return stable for less than 2 data points', async () => {
        const singlePoint: TrendDataPoint[] = [
          { date: '2024-01-15', avgLevel: 5.0 },
        ];
        const mockData = createMockAggregatedData({ trendData: singlePoint });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.trends.direction).toBe('stable');
      });

      it('should return stable for empty trend data', async () => {
        const mockData = createMockAggregatedData({ trendData: [] });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.trends.direction).toBe('stable');
      });

      it('should include daily averages in response', async () => {
        const mockData = createMockAggregatedData();
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.trends.dailyAverages).toHaveLength(5);
        expect(result.trends.dailyAverages[0]).toHaveProperty('date');
        expect(result.trends.dailyAverages[0]).toHaveProperty('avgLevel');
      });
    });

    describe('distribution calculations', () => {
      it('should calculate percentage distribution by level', async () => {
        const mockData = createMockAggregatedData({
          totalSubmissions: 100,
          distributionByLevel: { 1: 50, 5: 30, 10: 20 },
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        const level1 = result.distribution.byLevel.find((d) => d.level === 1);
        const level5 = result.distribution.byLevel.find((d) => d.level === 5);
        const level10 = result.distribution.byLevel.find((d) => d.level === 10);

        expect(level1?.percentage).toBe(50);
        expect(level5?.percentage).toBe(30);
        expect(level10?.percentage).toBe(20);
      });

      it('should sort distribution by level ascending', async () => {
        const mockData = createMockAggregatedData({
          distributionByLevel: { 10: 5, 1: 10, 5: 15 },
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        const levels = result.distribution.byLevel.map((d) => d.level);
        expect(levels).toEqual([1, 5, 10]);
      });

      it('should calculate percentage distribution by category', async () => {
        const mockData = createMockAggregatedData({
          totalSubmissions: 100,
          distributionByCategory: {
            'cat-work': 60,
            'cat-personal': 40,
          },
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        const workCat = result.distribution.byCategory.find(
          (d) => d.categoryId === 'cat-work',
        );
        const personalCat = result.distribution.byCategory.find(
          (d) => d.categoryId === 'cat-personal',
        );

        expect(workCat?.percentage).toBe(60);
        expect(personalCat?.percentage).toBe(40);
      });

      it('should handle zero total submissions in distribution', async () => {
        const mockData = createMockAggregatedData({
          totalSubmissions: 0,
          distributionByLevel: {},
          distributionByCategory: {},
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.distribution.byLevel).toHaveLength(0);
        expect(result.distribution.byCategory).toHaveLength(0);
      });
    });

    describe('alert statistics', () => {
      it('should calculate critical alerts (levels 9-10)', async () => {
        const mockData = createMockAggregatedData({
          distributionByLevel: { 9: 5, 10: 3 },
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.alerts.criticalCount).toBe(8);
      });

      it('should calculate high alerts (levels 7-8)', async () => {
        const mockData = createMockAggregatedData({
          distributionByLevel: { 7: 10, 8: 7 },
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.alerts.highCount).toBe(17);
      });

      it('should calculate medium alerts (level 6)', async () => {
        const mockData = createMockAggregatedData({
          distributionByLevel: { 6: 12 },
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.alerts.mediumCount).toBe(12);
      });

      it('should calculate total alerts triggered', async () => {
        const mockData = createMockAggregatedData({
          distributionByLevel: {
            6: 10, // medium
            7: 8, // high
            8: 5, // high
            9: 3, // critical
            10: 2, // critical
          },
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.alerts.totalAlertsTriggered).toBe(28); // 10+8+5+3+2
        expect(result.alerts.criticalCount).toBe(5); // 3+2
        expect(result.alerts.highCount).toBe(13); // 8+5
        expect(result.alerts.mediumCount).toBe(10);
      });

      it('should handle missing levels in distribution', async () => {
        const mockData = createMockAggregatedData({
          distributionByLevel: { 1: 50, 2: 50 }, // No alert levels
        });
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.alerts.totalAlertsTriggered).toBe(0);
        expect(result.alerts.criticalCount).toBe(0);
        expect(result.alerts.highCount).toBe(0);
        expect(result.alerts.mediumCount).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle completely empty data', async () => {
        const emptyData: AggregatedData = {
          totalSubmissions: 0,
          averageEmotionLevel: 0,
          distributionByLevel: {},
          distributionByCategory: {},
          anonymousCount: 0,
          identifiedCount: 0,
          trendData: [],
        };
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          emptyData,
        );

        const result = await useCase.execute(validDto, organizationId);

        expect(result.summary.totalSubmissions).toBe(0);
        expect(result.summary.motivationScore).toBe(0);
        expect(result.summary.anonymityRate).toBe(0);
        expect(result.trends.direction).toBe('stable');
        expect(result.distribution.byLevel).toHaveLength(0);
        expect(result.distribution.byCategory).toHaveLength(0);
        expect(result.alerts.totalAlertsTriggered).toBe(0);
      });

      it('should return complete response structure', async () => {
        const mockData = createMockAggregatedData();
        submissionRepository.getAggregatedByTimeRange.mockResolvedValue(
          mockData,
        );

        const result = await useCase.execute(validDto, organizationId);

        // Verify complete structure
        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('trends');
        expect(result).toHaveProperty('distribution');
        expect(result).toHaveProperty('alerts');

        expect(result.summary).toHaveProperty('totalSubmissions');
        expect(result.summary).toHaveProperty('averageEmotionLevel');
        expect(result.summary).toHaveProperty('motivationScore');
        expect(result.summary).toHaveProperty('anonymityRate');

        expect(result.trends).toHaveProperty('direction');
        expect(result.trends).toHaveProperty('dailyAverages');

        expect(result.distribution).toHaveProperty('byLevel');
        expect(result.distribution).toHaveProperty('byCategory');

        expect(result.alerts).toHaveProperty('totalAlertsTriggered');
        expect(result.alerts).toHaveProperty('criticalCount');
        expect(result.alerts).toHaveProperty('highCount');
        expect(result.alerts).toHaveProperty('mediumCount');
      });
    });
  });
});
