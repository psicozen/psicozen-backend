import type { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import type {
  EmociogramaAlertEntity,
  AlertSeverity,
} from '../entities/alert.entity';

/**
 * Estatísticas de alertas para o dashboard
 */
export interface AlertStatistics {
  /** Total de alertas no período */
  total: number;

  /** Contagem de alertas por severidade */
  bySeverity: Record<AlertSeverity, number>;

  /** Quantidade de alertas não resolvidos */
  unresolved: number;

  /** Quantidade de alertas resolvidos hoje */
  resolvedToday: number;
}

/**
 * Opções para consultas paginadas de alertas
 */
export interface AlertFindOptions {
  skip?: number;
  take?: number;
  includeResolved?: boolean;
  severity?: AlertSeverity;
}

/**
 * Resultado paginado de alertas
 */
export interface AlertPaginatedResult {
  data: EmociogramaAlertEntity[];
  total: number;
}

/**
 * Interface do Repositório de Alertas do Emociograma
 *
 * Define o contrato para persistência e consultas de alertas gerados
 * pelo sistema quando colaboradores reportam níveis emocionais preocupantes.
 *
 * Usado pelos gestores/admins para monitorar e responder a situações
 * que requerem atenção na organização.
 */
export interface IEmociogramaAlertRepository
  extends IBaseRepository<EmociogramaAlertEntity> {
  /**
   * Encontrar todos os alertas não resolvidos de uma organização
   *
   * Retorna alertas pendentes ordenados por severidade (críticos primeiro)
   * e data de criação (mais recentes primeiro).
   *
   * @param organizationId - ID da organização
   * @returns Lista de alertas não resolvidos
   */
  findUnresolved(organizationId: string): Promise<EmociogramaAlertEntity[]>;

  /**
   * Encontrar todos os alertas de uma organização com paginação
   *
   * Permite filtrar por severidade e incluir/excluir alertas resolvidos.
   * Útil para histórico e auditoria.
   *
   * @param organizationId - ID da organização
   * @param options - Opções de paginação e filtros
   * @returns Resultado paginado com alertas e total
   */
  findByOrganization(
    organizationId: string,
    options?: AlertFindOptions,
  ): Promise<AlertPaginatedResult>;

  /**
   * Encontrar alerta por ID de submissão
   *
   * Cada submissão pode ter no máximo um alerta associado.
   * Útil para verificar se uma submissão já gerou alerta.
   *
   * @param submissionId - ID da submissão
   * @returns Alerta encontrado ou null
   */
  findBySubmission(
    submissionId: string,
  ): Promise<EmociogramaAlertEntity | null>;

  /**
   * Obter estatísticas de alertas para o dashboard
   *
   * Retorna métricas consolidadas para visualização em dashboard:
   * - Total de alertas
   * - Distribuição por severidade
   * - Quantidade de não resolvidos
   * - Resolvidos nas últimas 24 horas
   *
   * @param organizationId - ID da organização
   * @returns Estatísticas consolidadas
   */
  getStatistics(organizationId: string): Promise<AlertStatistics>;

  /**
   * Encontrar alertas por severidade
   *
   * Útil para priorização e relatórios.
   *
   * @param organizationId - ID da organização
   * @param severity - Nível de severidade
   * @returns Lista de alertas com a severidade especificada
   */
  findBySeverity(
    organizationId: string,
    severity: AlertSeverity,
  ): Promise<EmociogramaAlertEntity[]>;

  /**
   * Contar alertas não resolvidos por severidade
   *
   * Útil para badges e indicadores visuais no dashboard.
   *
   * @param organizationId - ID da organização
   * @returns Contagem por severidade (apenas não resolvidos)
   */
  countUnresolvedBySeverity(
    organizationId: string,
  ): Promise<Record<AlertSeverity, number>>;

  /**
   * Encontrar alertas criados em um período
   *
   * @param organizationId - ID da organização
   * @param startDate - Data inicial do período
   * @param endDate - Data final do período
   * @returns Lista de alertas no período
   */
  findByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EmociogramaAlertEntity[]>;

  /**
   * Marcar múltiplos alertas como resolvidos em lote
   *
   * Útil para operações de bulk quando um gestor resolve
   * vários alertas de uma vez.
   *
   * @param alertIds - Lista de IDs dos alertas
   * @param resolvedBy - ID do usuário que está resolvendo
   * @param notes - Notas opcionais da resolução
   * @returns Quantidade de alertas atualizados
   */
  bulkResolve(
    alertIds: string[],
    resolvedBy: string,
    notes?: string,
  ): Promise<number>;
}

/**
 * Token de injeção de dependência para o repositório de alertas
 */
export const EMOCIOGRAMA_ALERT_REPOSITORY = Symbol(
  'IEmociogramaAlertRepository',
);
