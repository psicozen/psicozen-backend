import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  IEmociogramaAlertRepository,
  AlertStatistics,
} from '../../domain/repositories/alert.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type {
  EmociogramaAlertEntity,
  AlertSeverity,
} from '../../domain/entities/alert.entity';

/**
 * Resposta do dashboard de alertas
 */
export interface AlertDashboardResponse {
  /** Estatísticas gerais de alertas */
  statistics: {
    /** Total de alertas na organização */
    total: number;
    /** Quantidade de alertas não resolvidos */
    unresolved: number;
    /** Quantidade de alertas resolvidos hoje */
    resolvedToday: number;
    /** Distribuição por severidade */
    bySeverity: Record<AlertSeverity, number>;
  };
  /** Alertas não resolvidos mais recentes (máx 10) */
  recentAlerts: EmociogramaAlertEntity[];
}

/**
 * Caso de Uso: Obter Dashboard de Alertas
 *
 * Responsável por consolidar estatísticas e alertas recentes
 * para exibição no dashboard de gestão de alertas.
 *
 * Funcionalidades:
 * - Estatísticas gerais (total, não resolvidos, resolvidos hoje)
 * - Distribuição por severidade (critical, high, medium, low)
 * - Lista dos 10 alertas não resolvidos mais recentes
 *
 * Ordenação dos alertas:
 * - Severidade (críticos primeiro)
 * - Data de criação (mais recentes primeiro)
 */
@Injectable()
export class GetAlertDashboardUseCase {
  private readonly logger = new Logger(GetAlertDashboardUseCase.name);

  /** Número máximo de alertas recentes a retornar */
  private readonly MAX_RECENT_ALERTS = 10;

  constructor(
    @Inject(EMOCIOGRAMA_ALERT_REPOSITORY)
    private readonly alertRepository: IEmociogramaAlertRepository,
  ) {}

  /**
   * Executa a obtenção dos dados do dashboard de alertas
   *
   * @param organizationId - ID da organização
   * @returns Dados consolidados para o dashboard
   */
  async execute(organizationId: string): Promise<AlertDashboardResponse> {
    this.logger.log(
      `Obtendo dashboard de alertas para organização ${organizationId}`,
    );

    // Buscar estatísticas e alertas não resolvidos em paralelo
    const [statistics, unresolvedAlerts] = await Promise.all([
      this.alertRepository.getStatistics(organizationId),
      this.alertRepository.findUnresolved(organizationId),
    ]);

    // Limitar alertas recentes ao máximo configurado
    const recentAlerts = unresolvedAlerts.slice(0, this.MAX_RECENT_ALERTS);

    this.logger.log(
      `Dashboard gerado: ${statistics.total} alertas totais, ${statistics.unresolved} não resolvidos, ${recentAlerts.length} recentes`,
    );

    return {
      statistics: {
        total: statistics.total,
        unresolved: statistics.unresolved,
        resolvedToday: statistics.resolvedToday,
        bySeverity: statistics.bySeverity,
      },
      recentAlerts,
    };
  }
}
