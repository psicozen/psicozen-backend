import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetAnalyticsUseCase } from './get-analytics.use-case';
import type { AnalyticsResponse } from './get-analytics.use-case';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type {
  IEmociogramaSubmissionRepository,
  UserMotivationScore,
  AggregatedData,
} from '../../domain/repositories/submission.repository.interface';
import { AnalyticsQueryDto } from '../dtos/analytics-query.dto';

describe('GetAnalyticsUseCase', () => {
  let useCase: GetAnalyticsUseCase;
  let mockRepository: jest.Mocked<IEmociogramaSubmissionRepository>;

  const organizationId = 'org-123';
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');

  const mockMostMotivated: UserMotivationScore[] = [
    {
      userId: 'user-1',
      averageEmotionLevel: 2.5,
      submissionCount: 20,
      lastSubmittedAt: new Date('2024-01-30'),
    },
    {
      userId: 'user-2',
      averageEmotionLevel: 3.0,
      submissionCount: 15,
      lastSubmittedAt: new Date('2024-01-29'),
    },
  ];

  const mockLeastMotivated: UserMotivationScore[] = [
    {
      userId: 'user-3',
      averageEmotionLevel: 8.5,
      submissionCount: 10,
      lastSubmittedAt: new Date('2024-01-28'),
    },
    {
      userId: 'user-4',
      averageEmotionLevel: 7.0,
      submissionCount: 12,
      lastSubmittedAt: new Date('2024-01-27'),
    },
  ];

  const mockAggregatedData: AggregatedData = {
    totalSubmissions: 100,
    averageEmotionLevel: 4.5,
    distributionByLevel: { 1: 10, 2: 15, 3: 20, 4: 25, 5: 15, 6: 10, 7: 5 },
    distributionByCategory: { 'cat-1': 50, 'cat-2': 30, 'cat-3': 20 },
    anonymousCount: 30,
    identifiedCount: 70,
    trendData: [
      { date: '2024-01-01', avgLevel: 4.0 },
      { date: '2024-01-02', avgLevel: 4.5 },
      { date: '2024-01-03', avgLevel: 5.0 },
      { date: '2024-01-04', avgLevel: 3.5 },
      { date: '2024-01-05', avgLevel: 6.0 },
    ],
  };

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      existsById: jest.fn(),
      findByUser: jest.fn(),
      getAggregatedByTimeRange: jest.fn(),
      findSubmissionsAboveThreshold: jest.fn(),
      getMostMotivated: jest.fn(),
      getLeastMotivated: jest.fn(),
      getByDepartment: jest.fn(),
      getByTeam: jest.fn(),
      deleteByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
    } as jest.Mocked<IEmociogramaSubmissionRepository>;

    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAnalyticsUseCase,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAnalyticsUseCase>(GetAnalyticsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('deve retornar analytics completo da organização', async () => {
      mockRepository.getMostMotivated.mockResolvedValue(mockMostMotivated);
      mockRepository.getLeastMotivated.mockResolvedValue(mockLeastMotivated);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(mockAggregatedData);

      const query: AnalyticsQueryDto = { startDate, endDate };

      const result = await useCase.execute(organizationId, query);

      expect(result.period.startDate).toEqual(startDate);
      expect(result.period.endDate).toEqual(endDate);
      expect(result.motivation.mostMotivated).toEqual(mockMostMotivated);
      expect(result.motivation.leastMotivated).toEqual(mockLeastMotivated);
      expect(result.motivation.overallScore).toBeGreaterThan(0);
      expect(result.patterns).toBeDefined();
    });

    it('deve usar limite padrão de 10 quando não especificado', async () => {
      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(mockAggregatedData);

      const query: AnalyticsQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query);

      expect(mockRepository.getMostMotivated).toHaveBeenCalledWith(organizationId, 10);
      expect(mockRepository.getLeastMotivated).toHaveBeenCalledWith(organizationId, 10);
    });

    it('deve usar limite personalizado quando especificado', async () => {
      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(mockAggregatedData);

      const query: AnalyticsQueryDto = { startDate, endDate, limit: 5 };

      await useCase.execute(organizationId, query);

      expect(mockRepository.getMostMotivated).toHaveBeenCalledWith(organizationId, 5);
      expect(mockRepository.getLeastMotivated).toHaveBeenCalledWith(organizationId, 5);
    });

    it('deve chamar getAggregatedByTimeRange com parâmetros corretos', async () => {
      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(mockAggregatedData);

      const query: AnalyticsQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query);

      expect(mockRepository.getAggregatedByTimeRange).toHaveBeenCalledWith(
        organizationId,
        startDate,
        endDate,
      );
    });

    it('deve executar buscas em paralelo para performance', async () => {
      mockRepository.getMostMotivated.mockResolvedValue(mockMostMotivated);
      mockRepository.getLeastMotivated.mockResolvedValue(mockLeastMotivated);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(mockAggregatedData);

      const query: AnalyticsQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query);

      // Todas as chamadas devem acontecer (Promise.all)
      expect(mockRepository.getMostMotivated).toHaveBeenCalledTimes(1);
      expect(mockRepository.getLeastMotivated).toHaveBeenCalledTimes(1);
      expect(mockRepository.getAggregatedByTimeRange).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculatePatterns (via execute)', () => {
    it('deve identificar dias de pico corretamente', async () => {
      const trendDataWithVariation: AggregatedData = {
        ...mockAggregatedData,
        trendData: [
          { date: '2024-01-01', avgLevel: 2.0 }, // Pico (menor = melhor)
          { date: '2024-01-02', avgLevel: 8.0 }, // Baixa
          { date: '2024-01-03', avgLevel: 3.0 }, // Pico
          { date: '2024-01-04', avgLevel: 7.0 }, // Baixa
          { date: '2024-01-05', avgLevel: 4.0 }, // Pico
        ],
      };

      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(trendDataWithVariation);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result = await useCase.execute(organizationId, query);

      expect(result.patterns.peakDays).toContain('2024-01-01');
      expect(result.patterns.peakDays).toContain('2024-01-03');
    });

    it('deve identificar dias de baixa corretamente', async () => {
      const trendDataWithVariation: AggregatedData = {
        ...mockAggregatedData,
        trendData: [
          { date: '2024-01-01', avgLevel: 2.0 },
          { date: '2024-01-02', avgLevel: 8.0 }, // Baixa
          { date: '2024-01-03', avgLevel: 3.0 },
          { date: '2024-01-04', avgLevel: 9.0 }, // Baixa
          { date: '2024-01-05', avgLevel: 7.0 }, // Baixa
        ],
      };

      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(trendDataWithVariation);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result = await useCase.execute(organizationId, query);

      expect(result.patterns.lowDays).toContain('2024-01-04');
      expect(result.patterns.lowDays).toContain('2024-01-02');
    });

    it('deve retornar padrões vazios quando não há dados de tendência', async () => {
      const emptyTrendData: AggregatedData = {
        ...mockAggregatedData,
        trendData: [],
      };

      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(emptyTrendData);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result = await useCase.execute(organizationId, query);

      expect(result.patterns.peakDays).toEqual([]);
      expect(result.patterns.lowDays).toEqual([]);
      expect(result.patterns.averageByDayOfWeek).toEqual([]);
    });

    it('deve calcular média por dia da semana', async () => {
      // Segunda-feira (dayOfWeek = 1) com múltiplos pontos
      const trendDataWithDays: AggregatedData = {
        ...mockAggregatedData,
        trendData: [
          { date: '2024-01-01', avgLevel: 4.0 }, // Segunda
          { date: '2024-01-08', avgLevel: 6.0 }, // Segunda
          { date: '2024-01-02', avgLevel: 3.0 }, // Terça
        ],
      };

      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(trendDataWithDays);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result = await useCase.execute(organizationId, query);

      expect(result.patterns.averageByDayOfWeek.length).toBeGreaterThan(0);
      expect(
        result.patterns.averageByDayOfWeek.every(
          (item) => item.dayOfWeek >= 0 && item.dayOfWeek <= 6,
        ),
      ).toBe(true);
    });
  });

  describe('calculateOverallMotivationScore (via execute)', () => {
    it('deve calcular pontuação de motivação corretamente para média 4.5', async () => {
      const dataWithAvg45: AggregatedData = {
        ...mockAggregatedData,
        averageEmotionLevel: 4.5,
      };

      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(dataWithAvg45);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result = await useCase.execute(organizationId, query);

      // (11 - 4.5) / 10 * 100 = 65%
      expect(result.motivation.overallScore).toBe(65);
    });

    it('deve retornar 100% para média 1 (melhor possível)', async () => {
      const dataWithAvg1: AggregatedData = {
        ...mockAggregatedData,
        averageEmotionLevel: 1,
      };

      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(dataWithAvg1);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result = await useCase.execute(organizationId, query);

      // (11 - 1) / 10 * 100 = 100%
      expect(result.motivation.overallScore).toBe(100);
    });

    it('deve retornar 10% para média 10 (pior possível)', async () => {
      const dataWithAvg10: AggregatedData = {
        ...mockAggregatedData,
        averageEmotionLevel: 10,
      };

      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(dataWithAvg10);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result = await useCase.execute(organizationId, query);

      // (11 - 10) / 10 * 100 = 10%
      expect(result.motivation.overallScore).toBe(10);
    });

    it('deve retornar 0 para média 0 (sem dados)', async () => {
      const dataWithAvg0: AggregatedData = {
        ...mockAggregatedData,
        averageEmotionLevel: 0,
      };

      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(dataWithAvg0);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result = await useCase.execute(organizationId, query);

      expect(result.motivation.overallScore).toBe(0);
    });
  });

  describe('estrutura de resposta', () => {
    it('deve retornar estrutura completa de AnalyticsResponse', async () => {
      mockRepository.getMostMotivated.mockResolvedValue(mockMostMotivated);
      mockRepository.getLeastMotivated.mockResolvedValue(mockLeastMotivated);
      mockRepository.getAggregatedByTimeRange.mockResolvedValue(mockAggregatedData);

      const query: AnalyticsQueryDto = { startDate, endDate };
      const result: AnalyticsResponse = await useCase.execute(organizationId, query);

      // Verificar estrutura period
      expect(result.period).toHaveProperty('startDate');
      expect(result.period).toHaveProperty('endDate');

      // Verificar estrutura motivation
      expect(result.motivation).toHaveProperty('mostMotivated');
      expect(result.motivation).toHaveProperty('leastMotivated');
      expect(result.motivation).toHaveProperty('overallScore');

      // Verificar estrutura patterns
      expect(result.patterns).toHaveProperty('peakDays');
      expect(result.patterns).toHaveProperty('lowDays');
      expect(result.patterns).toHaveProperty('averageByDayOfWeek');

      // Verificar tipos
      expect(Array.isArray(result.motivation.mostMotivated)).toBe(true);
      expect(Array.isArray(result.motivation.leastMotivated)).toBe(true);
      expect(typeof result.motivation.overallScore).toBe('number');
      expect(Array.isArray(result.patterns.peakDays)).toBe(true);
      expect(Array.isArray(result.patterns.lowDays)).toBe(true);
      expect(Array.isArray(result.patterns.averageByDayOfWeek)).toBe(true);
    });
  });

  describe('tratamento de erros', () => {
    it('deve propagar erro do repositório', async () => {
      const error = new Error('Database connection failed');
      mockRepository.getMostMotivated.mockRejectedValue(error);

      const query: AnalyticsQueryDto = { startDate, endDate };

      await expect(useCase.execute(organizationId, query)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('deve propagar erro de getAggregatedByTimeRange', async () => {
      mockRepository.getMostMotivated.mockResolvedValue([]);
      mockRepository.getLeastMotivated.mockResolvedValue([]);
      mockRepository.getAggregatedByTimeRange.mockRejectedValue(
        new Error('Aggregation failed'),
      );

      const query: AnalyticsQueryDto = { startDate, endDate };

      await expect(useCase.execute(organizationId, query)).rejects.toThrow(
        'Aggregation failed',
      );
    });
  });
});
