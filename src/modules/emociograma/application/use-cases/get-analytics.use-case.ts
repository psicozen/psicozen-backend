import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  IEmociogramaSubmissionRepository,
  UserMotivationScore,
} from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import { AnalyticsQueryDto } from '../dtos/analytics-query.dto';

/**
 * Resposta do analytics avançado
 */
export interface AnalyticsResponse {
  period: {
    startDate: Date;
    endDate: Date;
  };
  motivation: {
    mostMotivated: UserMotivationScore[];
    leastMotivated: UserMotivationScore[];
    overallScore: number;
  };
  patterns: {
    peakDays: string[];
    lowDays: string[];
    averageByDayOfWeek: { dayOfWeek: number; avgLevel: number }[];
  };
  departments?: {
    name: string;
    avgEmotionLevel: number;
    totalSubmissions: number;
  }[];
  teams?: {
    name: string;
    avgEmotionLevel: number;
    totalSubmissions: number;
  }[];
}

/**
 * Caso de Uso: Obter Analytics da Organização
 *
 * Responsável por gerar analytics avançados sobre os dados
 * de emociograma da organização, incluindo:
 * - Colaboradores mais/menos motivados
 * - Padrões temporais
 * - Análise por departamento/equipe
 */
@Injectable()
export class GetAnalyticsUseCase {
  private readonly logger = new Logger(GetAnalyticsUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
  ) {}

  /**
   * Executa a geração de analytics
   *
   * @param organizationId - ID da organização
   * @param query - Parâmetros de consulta (período, filtros)
   * @returns Analytics completo da organização
   */
  async execute(
    organizationId: string,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsResponse> {
    this.logger.log(
      `Gerando analytics - orgId: ${organizationId}, período: ${query.startDate.toISOString()} - ${query.endDate.toISOString()}`,
    );

    // Buscar dados de motivação
    const [mostMotivated, leastMotivated, aggregatedData] = await Promise.all([
      this.submissionRepository.getMostMotivated(organizationId, query.limit || 10),
      this.submissionRepository.getLeastMotivated(organizationId, query.limit || 10),
      this.submissionRepository.getAggregatedByTimeRange(
        organizationId,
        query.startDate,
        query.endDate,
      ),
    ]);

    // Calcular padrões temporais
    const patterns = this.calculatePatterns(aggregatedData.trendData);

    // Calcular pontuação geral de motivação
    const overallScore = this.calculateOverallMotivationScore(
      aggregatedData.averageEmotionLevel,
    );

    this.logger.log(
      `Analytics gerado: motivação geral ${overallScore}%, ${mostMotivated.length} mais motivados`,
    );

    return {
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      motivation: {
        mostMotivated,
        leastMotivated,
        overallScore,
      },
      patterns,
    };
  }

  /**
   * Calcula padrões temporais baseado nos dados de tendência
   */
  private calculatePatterns(
    trendData: { date: string; avgLevel: number }[],
  ): AnalyticsResponse['patterns'] {
    if (trendData.length === 0) {
      return {
        peakDays: [],
        lowDays: [],
        averageByDayOfWeek: [],
      };
    }

    // Ordenar por nível de emoção
    const sorted = [...trendData].sort((a, b) => a.avgLevel - b.avgLevel);

    // Dias de pico (menor emoção = melhor) e baixa (maior emoção = pior)
    const peakDays = sorted.slice(0, 3).map((d) => d.date);
    const lowDays = sorted.slice(-3).reverse().map((d) => d.date);

    // Calcular média por dia da semana
    const byDayOfWeek: Record<number, { total: number; count: number }> = {};
    for (const point of trendData) {
      const dayOfWeek = new Date(point.date).getDay();
      if (!byDayOfWeek[dayOfWeek]) {
        byDayOfWeek[dayOfWeek] = { total: 0, count: 0 };
      }
      byDayOfWeek[dayOfWeek].total += point.avgLevel;
      byDayOfWeek[dayOfWeek].count += 1;
    }

    const averageByDayOfWeek = Object.entries(byDayOfWeek).map(
      ([day, data]) => ({
        dayOfWeek: parseInt(day, 10),
        avgLevel: data.total / data.count,
      }),
    );

    return {
      peakDays,
      lowDays,
      averageByDayOfWeek,
    };
  }

  /**
   * Calcula pontuação geral de motivação (escala invertida 0-100)
   */
  private calculateOverallMotivationScore(avgEmotionLevel: number): number {
    if (avgEmotionLevel === 0) return 0;
    return Math.round(((11 - avgEmotionLevel) / 10) * 100);
  }
}
