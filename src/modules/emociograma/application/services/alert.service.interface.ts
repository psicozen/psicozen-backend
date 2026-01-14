import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';

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
   * @param submission - A submissão que disparou o alerta
   * @returns Promise que resolve quando o alerta é processado
   */
  triggerEmotionalAlert(submission: EmociogramaSubmissionEntity): Promise<void>;
}

/**
 * Token de injeção de dependência para IAlertService
 */
export const ALERT_SERVICE = Symbol('IAlertService');
