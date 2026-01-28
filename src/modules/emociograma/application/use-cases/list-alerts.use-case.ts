import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IEmociogramaAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import type { AlertsQueryDto } from '../dtos/alerts-query.dto';

/**
 * Resultado paginado de alertas
 */
export interface AlertsListResult {
  data: EmociogramaAlertEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Caso de Uso: Listar Alertas
 *
 * Lista alertas de uma organização com paginação e filtros.
 */
@Injectable()
export class ListAlertsUseCase {
  private readonly logger = new Logger(ListAlertsUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_ALERT_REPOSITORY)
    private readonly alertRepository: IEmociogramaAlertRepository,
  ) {}

  /**
   * Executa a listagem de alertas
   *
   * @param organizationId - ID da organização
   * @param query - Parâmetros de paginação e filtros
   * @returns Lista paginada de alertas
   */
  async execute(
    organizationId: string,
    query: AlertsQueryDto,
  ): Promise<AlertsListResult> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    this.logger.log(
      `Listando alertas para organização ${organizationId} - página ${page}, limite ${limit}`,
    );

    const result = await this.alertRepository.findByOrganization(
      organizationId,
      {
        skip,
        take: limit,
        includeResolved: query.includeResolved,
        severity: query.severity,
      },
    );

    const totalPages = Math.ceil(result.total / limit);

    this.logger.log(
      `Encontrados ${result.total} alertas, retornando ${result.data.length}`,
    );

    return {
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }
}
