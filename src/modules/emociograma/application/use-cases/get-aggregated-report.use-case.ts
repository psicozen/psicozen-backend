import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  IEmociogramaSubmissionRepository,
  AggregatedData,
  TrendDataPoint,
} from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import { AggregatedReportDto } from '../dtos/aggregated-report.dto';

/**
 * Resposta do relatório agregado
 */
export interface AggregatedReportResponse {
  summary: {
    totalSubmissions: number;
    averageEmotionLevel: number;
    motivationScore: number; // 0-100 (nível de emoção invertido)
    anonymityRate: number; // % de submissões anônimas
  };
  trends: {
    direction: 'improving' | 'stable' | 'declining';
    dailyAverages: TrendDataPoint[];
  };
  distribution: {
    byLevel: { level: number; count: number; percentage: number }[];
    byCategory: { categoryId: string; count: number; percentage: number }[];
  };
  alerts: {
    totalAlertsTriggered: number; // Submissões >= limite (6)
    criticalCount: number; // >= 9
    highCount: number; // 7-8
    mediumCount: number; // 6
  };
}

/**
 * Caso de Uso: Obter Relatório Agregado
 *
 * Responsável por gerar relatórios estatísticos agregados das submissões
 * de emociograma para uma organização em um período específico.
 *
 * Funcionalidades:
 * - Resumo com totais e médias
 * - Pontuação de motivação (escala invertida)
 * - Análise de tendências (improving/stable/declining)
 * - Distribuição por nível de emoção e categoria
 * - Estatísticas de alertas por severidade
 */
@Injectable()
export class GetAggregatedReportUseCase {
  private readonly logger = new Logger(GetAggregatedReportUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
  ) {}

  /**
   * Executa a geração do relatório agregado
   *
   * @param dto - Parâmetros de filtro e período
   * @param organizationId - ID da organização
   * @returns Relatório agregado estruturado
   */
  async execute(
    dto: AggregatedReportDto,
    organizationId: string,
  ): Promise<AggregatedReportResponse> {
    this.logger.log(
      `Gerando relatório agregado - orgId: ${organizationId}, período: ${dto.startDate.toISOString()} - ${dto.endDate.toISOString()}`,
    );

    // Obter dados agregados do repositório
    const data = await this.submissionRepository.getAggregatedByTimeRange(
      organizationId,
      dto.startDate,
      dto.endDate,
      {
        department: dto.department,
        team: dto.team,
        categoryId: dto.categoryId,
      },
    );

    this.logger.debug(
      `Dados obtidos: ${data.totalSubmissions} submissões no período`,
    );

    // Calcular resumo
    const summary = this.calculateSummary(data);

    // Calcular tendências
    const trends = this.calculateTrends(data.trendData);

    // Calcular distribuições com percentuais
    const distribution = this.calculateDistribution(data);

    // Calcular estatísticas de alerta
    const alerts = this.calculateAlertStatistics(data.distributionByLevel);

    this.logger.log(
      `Relatório gerado: ${summary.totalSubmissions} submissões, motivação: ${summary.motivationScore}%, tendência: ${trends.direction}`,
    );

    return {
      summary,
      trends,
      distribution,
      alerts,
    };
  }

  /**
   * Calcula o resumo estatístico
   */
  private calculateSummary(
    data: AggregatedData,
  ): AggregatedReportResponse['summary'] {
    return {
      totalSubmissions: data.totalSubmissions,
      averageEmotionLevel: data.averageEmotionLevel,
      motivationScore: this.calculateMotivationScore(data.averageEmotionLevel),
      anonymityRate:
        data.totalSubmissions > 0
          ? (data.anonymousCount / data.totalSubmissions) * 100
          : 0,
    };
  }

  /**
   * Calcula pontuação de motivação (escala invertida)
   *
   * Na escala do emociograma:
   * - Nível 1 (muito feliz) = 100% motivação
   * - Nível 10 (muito triste) = 0% motivação
   */
  private calculateMotivationScore(averageEmotionLevel: number): number {
    if (averageEmotionLevel === 0) return 0;
    return Math.round(((11 - averageEmotionLevel) / 10) * 100);
  }

  /**
   * Calcula tendências baseado nos dados diários
   */
  private calculateTrends(
    trendData: TrendDataPoint[],
  ): AggregatedReportResponse['trends'] {
    return {
      direction: this.calculateTrendDirection(trendData),
      dailyAverages: trendData,
    };
  }

  /**
   * Determina a direção da tendência
   *
   * Compara a média dos 3 dias mais recentes com os 3 mais antigos.
   * - Se recente < antigo - 0.5: "improving" (menor emoção = melhor)
   * - Se recente > antigo + 0.5: "declining" (maior emoção = pior)
   * - Caso contrário: "stable"
   */
  private calculateTrendDirection(
    trendData: TrendDataPoint[],
  ): 'improving' | 'stable' | 'declining' {
    if (trendData.length < 2) return 'stable';

    const sortedData = [...trendData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const olderSlice = sortedData.slice(0, Math.min(3, sortedData.length));
    const recentSlice = sortedData.slice(-Math.min(3, sortedData.length));

    const olderAvg =
      olderSlice.reduce((sum, d) => sum + d.avgLevel, 0) / olderSlice.length;
    const recentAvg =
      recentSlice.reduce((sum, d) => sum + d.avgLevel, 0) / recentSlice.length;

    if (recentAvg < olderAvg - 0.5) return 'improving';
    if (recentAvg > olderAvg + 0.5) return 'declining';
    return 'stable';
  }

  /**
   * Calcula distribuições com percentuais
   */
  private calculateDistribution(
    data: AggregatedData,
  ): AggregatedReportResponse['distribution'] {
    const total = data.totalSubmissions;

    // Distribuição por nível (ordenada de 1 a 10)
    const byLevel = Object.entries(data.distributionByLevel)
      .map(([level, count]) => ({
        level: parseInt(level, 10),
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => a.level - b.level);

    // Distribuição por categoria
    const byCategory = Object.entries(data.distributionByCategory).map(
      ([categoryId, count]) => ({
        categoryId,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }),
    );

    return { byLevel, byCategory };
  }

  /**
   * Calcula estatísticas de alertas por severidade
   *
   * Baseado nos níveis de emoção que disparam alertas:
   * - Critical (>=9): Situação crítica que requer atenção imediata
   * - High (7-8): Alta preocupação
   * - Medium (6): Atenção moderada
   */
  private calculateAlertStatistics(
    distributionByLevel: Record<number, number>,
  ): AggregatedReportResponse['alerts'] {
    const criticalCount =
      (distributionByLevel[9] || 0) + (distributionByLevel[10] || 0);
    const highCount =
      (distributionByLevel[7] || 0) + (distributionByLevel[8] || 0);
    const mediumCount = distributionByLevel[6] || 0;

    return {
      totalAlertsTriggered: criticalCount + highCount + mediumCount,
      criticalCount,
      highCount,
      mediumCount,
    };
  }
}
