import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  IEmociogramaAlertRepository,
  AlertPaginatedResult,
} from '../../domain/repositories/alert.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type { AlertSeverity } from '../../domain/entities/alert.entity';

/**
 * Opções de filtro para listagem de alertas
 */
export interface ListAlertsOptions {
  /** Página atual (1-indexed) */
  page?: number;
  /** Quantidade de itens por página */
  limit?: number;
  /** Incluir alertas já resolvidos */
  includeResolved?: boolean;
  /** Filtrar por severidade */
  severity?: AlertSeverity;
}

/**
 * Caso de Uso: Listar Alertas
 *
 * Responsável por retornar uma lista paginada de alertas
 * de uma organização, com suporte a filtros.
 *
 * Funcionalidades:
 * - Paginação (page, limit)
 * - Filtro por severidade (low, medium, high, critical)
 * - Opção de incluir/excluir alertas resolvidos
 *
 * Ordenação padrão:
 * - Severidade (críticos primeiro)
 * - Data de criação (mais recentes primeiro)
 */
@Injectable()
export class ListAlertsUseCase {
  private readonly logger = new Logger(ListAlertsUseCase.name);

  /** Limite padrão de itens por página */
  private readonly DEFAULT_LIMIT = 20;

  /** Limite máximo de itens por página */
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(EMOCIOGRAMA_ALERT_REPOSITORY)
    private readonly alertRepository: IEmociogramaAlertRepository,
  ) {}

  /**
   * Executa a listagem de alertas com paginação e filtros
   *
   * @param organizationId - ID da organização
   * @param options - Opções de filtro e paginação
   * @returns Resultado paginado com alertas e total
   */
  async execute(
    organizationId: string,
    options: ListAlertsOptions = {},
  ): Promise<AlertPaginatedResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, options.limit || this.DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    this.logger.log(
      `Listando alertas para organização ${organizationId} - página ${page}, limite ${limit}`,
    );

    const result = await this.alertRepository.findByOrganization(
      organizationId,
      {
        skip,
        take: limit,
        includeResolved: options.includeResolved ?? false,
        severity: options.severity,
      },
    );

    this.logger.log(
      `Retornando ${result.data.length} alertas de ${result.total} total`,
    );

    return result;
  }
}
