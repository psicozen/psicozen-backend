import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IEmociogramaAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

/**
 * Caso de Uso: Obter Alerta por ID
 *
 * Recupera um alerta específico validando que pertence à organização.
 */
@Injectable()
export class GetAlertByIdUseCase {
  private readonly logger = new Logger(GetAlertByIdUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_ALERT_REPOSITORY)
    private readonly alertRepository: IEmociogramaAlertRepository,
  ) {}

  /**
   * Executa a busca de um alerta por ID
   *
   * @param alertId - ID do alerta
   * @param organizationId - ID da organização (para validação)
   * @returns O alerta encontrado
   * @throws NotFoundException - Se o alerta não for encontrado
   * @throws ForbiddenException - Se o alerta não pertencer à organização
   */
  async execute(
    alertId: string,
    organizationId: string,
  ): Promise<EmociogramaAlertEntity> {
    this.logger.log(`Buscando alerta ${alertId}`);

    const alert = await this.alertRepository.findById(alertId);

    if (!alert) {
      throw new NotFoundException(`Alerta com ID ${alertId} não encontrado`);
    }

    if (alert.organizationId !== organizationId) {
      this.logger.warn(
        `Tentativa de acesso ao alerta ${alertId} de outra organização`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este alerta',
      );
    }

    return alert;
  }
}
