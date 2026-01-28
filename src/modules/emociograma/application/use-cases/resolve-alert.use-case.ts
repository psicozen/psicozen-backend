import { Injectable, Inject } from '@nestjs/common';
import type { IAlertService } from '../services/alert.service.interface';
import { ALERT_SERVICE } from '../services/alert.service.interface';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

/**
 * Caso de Uso: Resolver Alerta
 *
 * Responsável por marcar um alerta como resolvido,
 * registrando o usuário que resolveu e notas opcionais.
 *
 * Regras de Negócio:
 * - Apenas alertas pendentes podem ser resolvidos
 * - O ID do usuário que resolve é registrado
 * - Notas de resolução são opcionais (máx 500 caracteres)
 *
 * @throws NotFoundException - Se o alerta não existir
 * @throws ConflictException - Se o alerta já foi resolvido
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
