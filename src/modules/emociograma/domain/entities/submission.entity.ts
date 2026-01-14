import { BaseEntity } from '../../../../core/domain/entities/base.entity';
import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';

/**
 * Parâmetros para criação de uma submissão de emociograma
 */
export interface CreateEmociogramaSubmissionParams {
  organizationId: string;
  userId: string;
  emotionLevel: number;
  categoryId: string;
  isAnonymous: boolean;
  comment?: string;
  department?: string;
  team?: string;
}

/**
 * Dados mascarados de uma submissão anônima
 * Preserva departamento/equipe para agregação mas esconde ID do usuário
 */
export interface MaskedSubmissionData {
  id: string;
  organizationId: string;
  userId: string; // Sempre 'anonymous' para submissões anônimas
  emotionLevel: number;
  emotionEmoji: string;
  categoryId: string;
  isAnonymous: boolean;
  comment?: string;
  commentFlagged: boolean;
  submittedAt: Date;
  department?: string;
  team?: string;
}

/**
 * Entidade de Domínio - Submissão de Emociograma
 *
 * Representa uma submissão individual de estado emocional por um colaborador.
 * Contém a lógica de negócio para validação, alertas e anonimização.
 *
 * Escala de emoção:
 * - 1-5: Emoções positivas (feliz até neutro)
 * - 6-10: Emoções negativas (cansado até muito triste) - disparam alerta
 */
export class EmociogramaSubmissionEntity extends BaseEntity {
  organizationId: string;
  userId: string;
  emotionLevel: number; // 1-10
  emotionEmoji: string;
  categoryId: string;
  isAnonymous: boolean;
  comment?: string;
  commentFlagged: boolean;
  submittedAt: Date;
  department?: string;
  team?: string;

  constructor(partial?: Partial<EmociogramaSubmissionEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /**
   * Método factory para criar uma nova submissão com validação
   *
   * @param params - Parâmetros de criação da submissão
   * @returns Nova instância de EmociogramaSubmissionEntity
   * @throws ValidationException - Se os parâmetros forem inválidos
   */
  static create(
    params: CreateEmociogramaSubmissionParams,
  ): EmociogramaSubmissionEntity {
    EmociogramaSubmissionEntity.validateCreateParams(params);

    return new EmociogramaSubmissionEntity({
      organizationId: params.organizationId,
      userId: params.userId,
      emotionLevel: params.emotionLevel,
      emotionEmoji: EmociogramaSubmissionEntity.getEmojiForLevel(
        params.emotionLevel,
      ),
      categoryId: params.categoryId,
      isAnonymous: params.isAnonymous,
      comment: params.comment?.trim() || undefined,
      commentFlagged: false,
      submittedAt: new Date(),
      department: params.department?.trim() || undefined,
      team: params.team?.trim() || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Determina se esta submissão deve disparar um alerta
   *
   * Limite: emotion_level >= 6 (emoções negativas)
   * Níveis 6-10 indicam estados emocionais que requerem atenção
   *
   * @returns true se o nível de emoção indica necessidade de alerta
   */
  shouldTriggerAlert(): boolean {
    return this.emotionLevel >= 6;
  }

  /**
   * Mascara a identidade do usuário para submissões anônimas
   *
   * Para submissões anônimas:
   * - Esconde o ID real do usuário (substitui por 'anonymous')
   * - Preserva departamento/equipe para permitir agregação
   * - Mantém o comentário (já deveria estar moderado)
   *
   * Para submissões não-anônimas:
   * - Retorna os dados completos sem alteração
   *
   * @returns Dados da submissão com identidade mascarada se anônima
   */
  maskIdentity(): MaskedSubmissionData {
    return {
      id: this.id,
      organizationId: this.organizationId,
      userId: this.isAnonymous ? 'anonymous' : this.userId,
      emotionLevel: this.emotionLevel,
      emotionEmoji: this.emotionEmoji,
      categoryId: this.categoryId,
      isAnonymous: this.isAnonymous,
      comment: this.comment,
      commentFlagged: this.commentFlagged,
      submittedAt: this.submittedAt,
      department: this.department,
      team: this.team,
    };
  }

  /**
   * Sinaliza o comentário para revisão de moderação
   *
   * Usado quando um comentário é identificado como potencialmente
   * inadequado e precisa ser revisado por um moderador.
   */
  flagComment(): void {
    this.commentFlagged = true;
    this.touch();
  }

  /**
   * Remove a sinalização do comentário após moderação
   *
   * Usado quando um moderador revisa e aprova o comentário.
   */
  unflagComment(): void {
    this.commentFlagged = false;
    this.touch();
  }

  /**
   * Mapeia nível de emoção (1-10) para emoji correspondente
   *
   * Escala:
   * - 1-5: Emoções positivas (feliz até neutro)
   *   - 1: 😄 Muito feliz
   *   - 2: 🙂 Feliz
   *   - 3: 😌 Satisfeito
   *   - 4: 😐 Neutro
   *   - 5: 😕 Levemente irritado
   *
   * - 6-10: Emoções negativas (cansado até muito triste) - DISPARAM ALERTA
   *   - 6: 😫 Cansado
   *   - 7: 😢 Triste
   *   - 8: 😣 Estressado
   *   - 9: 😟 Ansioso
   *   - 10: 😞 Muito triste/deprimido
   *
   * @param level - Nível de emoção (1-10)
   * @returns Emoji correspondente ao nível, ou '😐' se nível inválido
   */
  static getEmojiForLevel(level: number): string {
    const emojiMap: Record<number, string> = {
      1: '😄', // Muito feliz
      2: '🙂', // Feliz
      3: '😌', // Satisfeito
      4: '😐', // Neutro
      5: '😕', // Levemente irritado
      6: '😫', // Cansado (LIMITE DE ALERTA)
      7: '😢', // Triste
      8: '😣', // Estressado
      9: '😟', // Ansioso
      10: '😞', // Muito triste/deprimido
    };

    return emojiMap[level] || '😐';
  }

  /**
   * Valida os parâmetros de criação da submissão
   *
   * Regras de validação:
   * - organizationId: obrigatório
   * - userId: obrigatório
   * - categoryId: obrigatório
   * - emotionLevel: deve estar entre 1 e 10
   * - comment: máximo de 1000 caracteres (opcional)
   *
   * @param params - Parâmetros a serem validados
   * @throws ValidationException - Se qualquer validação falhar
   */
  private static validateCreateParams(
    params: CreateEmociogramaSubmissionParams,
  ): void {
    const errors: Record<string, string[]> = {};

    // Validar organizationId
    if (!params.organizationId || params.organizationId.trim().length === 0) {
      errors.organizationId = ['O ID da organização é obrigatório'];
    }

    // Validar userId
    if (!params.userId || params.userId.trim().length === 0) {
      errors.userId = ['O ID do usuário é obrigatório'];
    }

    // Validar categoryId
    if (!params.categoryId || params.categoryId.trim().length === 0) {
      errors.categoryId = ['O ID da categoria é obrigatório'];
    }

    // Validar emotionLevel (1-10)
    if (params.emotionLevel === undefined || params.emotionLevel === null) {
      errors.emotionLevel = ['O nível de emoção é obrigatório'];
    } else if (
      !Number.isInteger(params.emotionLevel) ||
      params.emotionLevel < 1 ||
      params.emotionLevel > 10
    ) {
      errors.emotionLevel = ['O nível de emoção deve ser um inteiro entre 1 e 10'];
    }

    // Validar comprimento do comentário (máx 1000 caracteres)
    if (params.comment && params.comment.length > 1000) {
      errors.comment = ['O comentário não pode exceder 1000 caracteres'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(errors);
    }
  }
}
