import { Injectable, Inject } from '@nestjs/common';
import type { IAlertService } from '../services/alert.service.interface';
import { ALERT_SERVICE } from '../services/alert.service.interface';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

/**
 * Caso de Uso: Resolver Alerta
 *
 * Marca um alerta como resolvido, registrando quem resolveu
 * e opcionalmente notas sobre a resolução.
 */
@Injectable()
export class ResolveAlertUseCase {
  constructor(
    @Inject(ALERT_SERVICE)
    private readonly alertService: IAlertService,
  ) {}

  /**
   * Executa a resolução de um alerta
   *
   * @param alertId - ID do alerta a ser resolvido
   * @param resolvedBy - ID do usuário que está resolvendo
   * @param notes - Notas opcionais sobre a resolução
   * @returns O alerta atualizado
   */
  async execute(
    alertId: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<EmociogramaAlertEntity> {
    return this.alertService.resolveAlert(alertId, resolvedBy, notes);
  }
}
