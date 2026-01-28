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
 * Responsável por recuperar um alerta específico pelo seu ID,
 * validando que o alerta pertence à organização do usuário.
 *
 * Regras de Negócio:
 * - Apenas alertas da mesma organização podem ser acessados
 * - Retorna todos os detalhes do alerta, incluindo resolução
 *
 * @throws NotFoundException - Se o alerta não existir
 * @throws ForbiddenException - Se o alerta pertencer a outra organização
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
   * @param alertId - ID do alerta a ser buscado
   * @param organizationId - ID da organização do usuário (para validação)
   * @returns O alerta encontrado
   * @throws NotFoundException - Se o alerta não existir
   * @throws ForbiddenException - Se o alerta pertencer a outra organização
   */
  async execute(
    alertId: string,
    organizationId: string,
  ): Promise<EmociogramaAlertEntity> {
    this.logger.log(`Buscando alerta ${alertId}`);

    const alert = await this.alertRepository.findById(alertId);

    if (!alert) {
      this.logger.warn(`Alerta ${alertId} não encontrado`);
      throw new NotFoundException(`Alerta com ID ${alertId} não encontrado`);
    }

    // Validar que o alerta pertence à organização do usuário
    if (alert.organizationId !== organizationId) {
      this.logger.warn(
        `Tentativa de acesso ao alerta ${alertId} de outra organização`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este alerta',
      );
    }

    this.logger.log(`Alerta ${alertId} recuperado com sucesso`);

    return alert;
  }
}
