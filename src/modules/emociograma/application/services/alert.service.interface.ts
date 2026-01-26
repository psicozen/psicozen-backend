import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

/**
 * Interface para o serviço de alertas emocionais
 *
 * Define o contrato para disparo de alertas quando
 * um colaborador submete um nível de emoção preocupante.
 */
export interface IAlertService {
  /**
   * Dispara um alerta emocional para gestores/administradores
   *
   * Deve ser chamado assincronamente (fire-and-forget) quando
   * uma submissão atinge o limite de alerta da organização.
   *
   * O alerta é persistido no banco de dados e notificações
   * são enviadas por email para gestores e administradores.
   *
   * @param submission - A submissão que disparou o alerta
   * @returns O alerta criado ou null se não houver gestores para notificar
   */
  triggerEmotionalAlert(
    submission: EmociogramaSubmissionEntity,
  ): Promise<EmociogramaAlertEntity | null>;

  /**
   * Resolve um alerta existente
   *
   * Marca o alerta como resolvido, registrando quem resolveu
   * e opcionalmente notas sobre a resolução.
   *
   * @param alertId - ID do alerta a ser resolvido
   * @param resolvedBy - ID do usuário que está resolvendo o alerta
   * @param notes - Notas opcionais sobre a resolução
   * @returns O alerta atualizado
   * @throws NotFoundException - Se o alerta não for encontrado
   * @throws ConflictException - Se o alerta já foi resolvido
   */
  resolveAlert(
    alertId: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<EmociogramaAlertEntity>;
}

/**
 * Token de injeção de dependência para IAlertService
 */
export const ALERT_SERVICE = Symbol('IAlertService');
