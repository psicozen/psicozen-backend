import { BaseEntity } from '../../../../core/domain/entities/base.entity';
import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';
import { EmociogramaSubmissionEntity } from './submission.entity';

/**
 * Tipos de alerta do Emociograma
 * - threshold_exceeded: Nível emocional acima do limite (>= 6)
 * - pattern_detected: Padrão negativo detectado ao longo do tempo
 */
export type AlertType = 'threshold_exceeded' | 'pattern_detected';

/**
 * Níveis de severidade do alerta
 * - low: Nível emocional < 6 (fallback, não deveria gerar alerta)
 * - medium: Nível emocional = 6 (cansado)
 * - high: Nível emocional 7-8 (triste/estressado)
 * - critical: Nível emocional 9-10 (ansioso/muito triste)
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Dados necessários para criar um alerta
 */
export interface CreateAlertData {
  organizationId: string;
  submissionId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
}

/**
 * Entidade de Domínio - Alerta do Emociograma
 *
 * Representa um alerta gerado automaticamente quando uma submissão
 * atinge níveis emocionais preocupantes (>= 6) ou quando padrões
 * negativos são detectados ao longo do tempo.
 *
 * O alerta é direcionado aos administradores/gestores da organização
 * para que possam tomar ações de suporte ao colaborador.
 */
export class EmociogramaAlertEntity extends BaseEntity {
  organizationId: string;
  submissionId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  notifiedUsers: string[];
  notificationSentAt?: Date;

  constructor(partial?: Partial<EmociogramaAlertEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
    // Garantir que notifiedUsers seja sempre um array
    if (!this.notifiedUsers) {
      this.notifiedUsers = [];
    }
  }

  /**
   * Método factory para criar um novo alerta com validação
   *
   * @param data - Dados para criação do alerta
   * @returns Nova instância de EmociogramaAlertEntity
   * @throws ValidationException - Se os dados forem inválidos
   */
  static create(data: CreateAlertData): EmociogramaAlertEntity {
    EmociogramaAlertEntity.validateCreateData(data);

    return new EmociogramaAlertEntity({
      organizationId: data.organizationId,
      submissionId: data.submissionId,
      alertType: data.alertType,
      severity: data.severity,
      message: data.message,
      isResolved: false,
      notifiedUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Criar alerta a partir de uma entidade de submissão
   *
   * Usado quando uma submissão atinge o limite de alerta (emotionLevel >= 6).
   * Calcula automaticamente a severidade e gera a mensagem apropriada.
   *
   * @param submission - Entidade de submissão que disparou o alerta
   * @returns Nova instância de EmociogramaAlertEntity
   * @throws ValidationException - Se a submissão não tiver ID
   */
  static fromSubmission(
    submission: EmociogramaSubmissionEntity,
  ): EmociogramaAlertEntity {
    if (!submission.id) {
      throw new ValidationException({
        submissionId: ['A submissão deve ter um ID para gerar um alerta'],
      });
    }

    const severity = EmociogramaAlertEntity.calculateSeverity(
      submission.emotionLevel,
    );
    const message = EmociogramaAlertEntity.generateAlertMessage(submission);

    return EmociogramaAlertEntity.create({
      organizationId: submission.organizationId,
      submissionId: submission.id,
      alertType: 'threshold_exceeded',
      severity,
      message,
    });
  }

  /**
   * Marcar o alerta como resolvido
   *
   * Usado quando um gestor/admin toma conhecimento do alerta
   * e registra que ações foram tomadas.
   *
   * @param resolvedBy - ID do usuário que está resolvendo o alerta
   * @param notes - Notas opcionais sobre a resolução
   */
  resolve(resolvedBy: string, notes?: string): void {
    if (!resolvedBy || resolvedBy.trim().length === 0) {
      throw new ValidationException({
        resolvedBy: ['O ID do usuário que resolveu é obrigatório'],
      });
    }

    this.isResolved = true;
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
    this.resolutionNotes = notes?.trim() || undefined;
    this.touch();
  }

  /**
   * Registrar que notificações foram enviadas
   *
   * @param userIds - Lista de IDs dos usuários que foram notificados
   */
  recordNotification(userIds: string[]): void {
    if (!userIds || userIds.length === 0) {
      throw new ValidationException({
        notifiedUsers: ['Pelo menos um usuário deve ser notificado'],
      });
    }

    this.notifiedUsers = [...userIds];
    this.notificationSentAt = new Date();
    this.touch();
  }

  /**
   * Verifica se o alerta ainda está pendente (não resolvido)
   *
   * @returns true se o alerta não foi resolvido
   */
  isPending(): boolean {
    return !this.isResolved;
  }

  /**
   * Verifica se as notificações foram enviadas
   *
   * @returns true se pelo menos uma notificação foi enviada
   */
  wasNotificationSent(): boolean {
    return (
      this.notifiedUsers.length > 0 && this.notificationSentAt !== undefined
    );
  }

  /**
   * Calcular severidade baseado no nível emocional
   *
   * Escala de severidade:
   * - critical: Níveis 9-10 (ansioso, muito triste) - Requer atenção IMEDIATA
   * - high: Níveis 7-8 (triste, estressado) - Requer atenção URGENTE
   * - medium: Nível 6 (cansado) - Requer MONITORAMENTO
   * - low: Níveis < 6 - Fallback (não deveria gerar alerta)
   *
   * @param emotionLevel - Nível de emoção (1-10)
   * @returns Severidade calculada
   */
  static calculateSeverity(emotionLevel: number): AlertSeverity {
    if (emotionLevel >= 9) return 'critical';
    if (emotionLevel >= 7) return 'high';
    if (emotionLevel >= 6) return 'medium';
    return 'low';
  }

  /**
   * Gerar mensagem legível do alerta
   *
   * Formato: "Colaborador reportou estado emocional {descrição} (Nível N/10). {localização}."
   *
   * @param submission - Submissão que gerou o alerta
   * @returns Mensagem formatada para exibição
   */
  static generateAlertMessage(submission: EmociogramaSubmissionEntity): string {
    const emotionDescriptions: Record<number, string> = {
      6: 'Cansado 😫',
      7: 'Triste 😢',
      8: 'Estressado 😣',
      9: 'Ansioso 😟',
      10: 'Muito triste 😞',
    };

    const emotionDescription =
      emotionDescriptions[submission.emotionLevel] || 'Negativo';

    // Determinar localização para contexto
    let location: string;
    if (submission.team) {
      location = `Equipe: ${submission.team}`;
    } else if (submission.department) {
      location = `Departamento: ${submission.department}`;
    } else {
      location = 'Localização não especificada';
    }

    return `Colaborador reportou estado emocional ${emotionDescription} (Nível ${submission.emotionLevel}/10). ${location}.`;
  }

  /**
   * Valida os dados de criação do alerta
   *
   * @param data - Dados a serem validados
   * @throws ValidationException - Se qualquer validação falhar
   */
  private static validateCreateData(data: CreateAlertData): void {
    const errors: Record<string, string[]> = {};

    // Validar organizationId
    if (!data.organizationId || data.organizationId.trim().length === 0) {
      errors.organizationId = ['O ID da organização é obrigatório'];
    }

    // Validar submissionId
    if (!data.submissionId || data.submissionId.trim().length === 0) {
      errors.submissionId = ['O ID da submissão é obrigatório'];
    }

    // Validar alertType
    const validAlertTypes: AlertType[] = [
      'threshold_exceeded',
      'pattern_detected',
    ];
    if (!data.alertType || !validAlertTypes.includes(data.alertType)) {
      errors.alertType = [
        'O tipo de alerta deve ser "threshold_exceeded" ou "pattern_detected"',
      ];
    }

    // Validar severity
    const validSeverities: AlertSeverity[] = [
      'low',
      'medium',
      'high',
      'critical',
    ];
    if (!data.severity || !validSeverities.includes(data.severity)) {
      errors.severity = [
        'A severidade deve ser "low", "medium", "high" ou "critical"',
      ];
    }

    // Validar message
    if (!data.message || data.message.trim().length === 0) {
      errors.message = ['A mensagem do alerta é obrigatória'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(errors);
    }
  }
}
