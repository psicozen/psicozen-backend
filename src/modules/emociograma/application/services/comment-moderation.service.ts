import { Injectable, Logger } from '@nestjs/common';

/**
 * Tipo de motivo de moderação
 */
export type ModerationReasonType =
  | 'inappropriate_language'
  | 'excessive_caps'
  | 'spam'
  | 'personal_info'
  | 'urgent_content';

/**
 * Resultado da moderação de um comentário
 */
export interface ModerationResult {
  /** Comentário após sanitização (palavras filtradas) */
  sanitizedComment: string;
  /** Indica se o comentário foi sinalizado para revisão humana */
  isFlagged: boolean;
  /** Motivos pelos quais o comentário foi sinalizado */
  flagReasons?: string[];
  /** Tipos de moderação aplicados (para processamento programático) */
  reasonTypes?: ModerationReasonType[];
}

/**
 * Serviço de moderação de comentários
 *
 * Responsável por sanitizar e sinalizar comentários
 * potencialmente inadequados em submissões de emociograma.
 *
 * Estratégia:
 * - Sanitização: Remove/substitui palavras proibidas
 * - Sinalização: Marca para revisão humana quando necessário
 *
 * Funcionalidades:
 * - Detecção de linguagem inapropriada
 * - Detecção de caps excessivos (gritaria)
 * - Detecção de spam (caracteres repetidos)
 * - Detecção de informações pessoais (LGPD: email, telefone, CPF)
 * - Detecção de conteúdo urgente (saúde mental, assédio)
 */
@Injectable()
export class CommentModerationService {
  private readonly logger = new Logger(CommentModerationService.name);

  /**
   * Lista de palavras/padrões que devem ser filtrados
   * Em produção, isso seria carregado de um banco de dados ou configurações da organização
   */
  private readonly blockedPatterns: RegExp[] = [
    // Palavras ofensivas em português
    /\b(idiota|estúpido|imbecil)\b/gi,
    // Palavrões comuns (exemplos genéricos - personalize conforme necessário)
    /\b(merda|porra|caralho|fdp|filho da puta)\b/gi,
    // Ameaças
    /\b(matar|morrer|suicid[aáio]r?)\b/gi,
    // Discurso de ódio
    /\b(odi[oa]r?|nojo)\b/gi,
    // Ofensivos genéricos em inglês
    /\b(hate|kill|die|stupid|idiot|moron|retard)\b/gi,
  ];

  /**
   * Padrões que indicam necessidade de revisão urgente
   * (sinalizam para revisão humana imediata)
   */
  private readonly urgentPatterns: RegExp[] = [
    // Indicadores de risco à saúde mental
    /\b(suicid|autolesão|me machucar|acabar com tudo)\b/gi,
    // Indicadores de assédio/abuso
    /\b(assédio|abuso|perseguição)\b/gi,
  ];

  /**
   * Padrão de caps excessivos (gritaria) - 10+ letras maiúsculas consecutivas
   */
  private readonly excessiveCapsPattern = /[A-Z]{10,}/g;

  /**
   * Padrão de spam (caracteres repetidos 6+ vezes)
   */
  private readonly spamPattern = /(.)\1{5,}/g;

  /**
   * Padrões de informações pessoais (proteção LGPD)
   */
  private readonly personalInfoPatterns: RegExp[] = [
    // Email
    /\b[\w.-]+@[\w.-]+\.\w{2,}\b/gi,
    // Telefone brasileiro (vários formatos)
    /\b\d{2}[-.\s]?\d{4,5}[-.\s]?\d{4}\b/g,
    // Celular com DDD
    /\b\(?0?\d{2}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}\b/g,
    // CPF (formato XXX.XXX.XXX-XX)
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    // CPF sem formatação (11 dígitos)
    /\b\d{11}\b/g,
  ];

  /**
   * Modera um comentário de emociograma
   *
   * @param comment - Comentário original do usuário
   * @returns Resultado da moderação com comentário sanitizado e flags
   */
  moderateComment(comment: string): ModerationResult {
    if (!comment || comment.trim().length === 0) {
      return {
        sanitizedComment: '',
        isFlagged: false,
      };
    }

    const flagReasons: string[] = [];
    const reasonTypes: ModerationReasonType[] = [];
    const originalComment = comment.trim();
    let sanitizedComment = originalComment;

    // 1. Verificar padrões urgentes no texto original (não sanitiza, apenas sinaliza)
    for (const pattern of this.urgentPatterns) {
      // Reset lastIndex para garantir que o teste funcione corretamente
      pattern.lastIndex = 0;
      if (pattern.test(originalComment)) {
        flagReasons.push('Conteúdo sensível detectado - requer atenção');
        reasonTypes.push('urgent_content');
        this.logger.warn(
          `Comentário sinalizado por padrão urgente: ${pattern.source}`,
        );
        break; // Um flag urgente é suficiente
      }
    }

    // 2. Verificar e sanitizar caps excessivos PRIMEIRO
    // Isso deve vir antes do spam para que "AAAAAAAAAAAA" seja tratado como caps excessivos
    this.excessiveCapsPattern.lastIndex = 0;
    if (this.excessiveCapsPattern.test(sanitizedComment)) {
      sanitizedComment = this.sanitizeExcessiveCaps(sanitizedComment);
      flagReasons.push('Texto com caps excessivos sanitizado');
      reasonTypes.push('excessive_caps');
      this.logger.debug('Caps excessivos detectados e sanitizados');
    }

    // 3. Verificar e sanitizar spam (caracteres repetidos)
    // Usa o texto original para detecção mas aplica no texto já parcialmente sanitizado
    this.spamPattern.lastIndex = 0;
    if (this.spamPattern.test(sanitizedComment)) {
      sanitizedComment = this.sanitizeSpam(sanitizedComment);
      flagReasons.push('Spam de caracteres detectado e sanitizado');
      reasonTypes.push('spam');
      this.logger.debug('Spam de caracteres detectado e sanitizado');
    }

    // 4. Sanitizar palavras bloqueadas (linguagem inapropriada)
    let hasInappropriateLanguage = false;
    for (const pattern of this.blockedPatterns) {
      // Reset lastIndex para garantir que o teste funcione corretamente
      pattern.lastIndex = 0;
      const matches = sanitizedComment.match(pattern);
      if (matches) {
        sanitizedComment = sanitizedComment.replace(pattern, (match) =>
          '*'.repeat(match.length),
        );
        hasInappropriateLanguage = true;
        this.logger.debug(`Palavra filtrada: ${matches.join(', ')}`);
      }
    }

    if (hasInappropriateLanguage) {
      flagReasons.push('Conteúdo inadequado filtrado');
      reasonTypes.push('inappropriate_language');
    }

    // 5. Verificar e sanitizar informações pessoais (LGPD)
    if (this.hasPersonalInfo(sanitizedComment)) {
      sanitizedComment = this.sanitizePersonalInfo(sanitizedComment);
      flagReasons.push('Informação pessoal removida (proteção LGPD)');
      reasonTypes.push('personal_info');
      this.logger.warn('Informação pessoal detectada e removida');
    }

    // 6. Sanitização básica (XSS prevention) - sempre por último
    sanitizedComment = this.sanitizeHtml(sanitizedComment);

    const isFlagged = flagReasons.length > 0;

    if (isFlagged) {
      this.logger.log(`Comentário sinalizado: ${flagReasons.join(', ')}`);
    }

    return {
      sanitizedComment,
      isFlagged,
      flagReasons: isFlagged ? flagReasons : undefined,
      reasonTypes: isFlagged ? reasonTypes : undefined,
    };
  }

  /**
   * Verifica se o comentário contém informações pessoais
   */
  private hasPersonalInfo(comment: string): boolean {
    return this.personalInfoPatterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(comment);
    });
  }

  /**
   * Sanitiza caps excessivos convertendo para lowercase mantendo primeira letra
   */
  private sanitizeExcessiveCaps(text: string): string {
    // Reset lastIndex antes de usar o padrão global
    this.excessiveCapsPattern.lastIndex = 0;
    return text.replace(this.excessiveCapsPattern, (match) => {
      return match.charAt(0) + match.slice(1).toLowerCase();
    });
  }

  /**
   * Sanitiza spam reduzindo caracteres repetidos para máximo de 3
   */
  private sanitizeSpam(text: string): string {
    // Reset lastIndex antes de usar o padrão global
    this.spamPattern.lastIndex = 0;
    return text.replace(this.spamPattern, '$1$1$1');
  }

  /**
   * Sanitiza informações pessoais substituindo por placeholder
   */
  private sanitizePersonalInfo(text: string): string {
    let sanitized = text;
    this.personalInfoPatterns.forEach((pattern) => {
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, '[INFORMAÇÃO PESSOAL REMOVIDA]');
    });
    return sanitized;
  }

  /**
   * Sanitiza HTML básico para prevenir XSS
   */
  private sanitizeHtml(text: string): string {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
