import { Injectable, Logger } from '@nestjs/common';

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
 */
@Injectable()
export class CommentModerationService {
  private readonly logger = new Logger(CommentModerationService.name);

  /**
   * Lista de palavras/padrões que devem ser filtrados
   * Em produção, isso seria carregado de um banco de dados
   */
  private readonly blockedPatterns: RegExp[] = [
    // Palavras ofensivas (exemplos genéricos)
    /\b(idiota|estúpido|imbecil)\b/gi,
    // Ameaças
    /\b(matar|morrer|suicid[aáio]r?)\b/gi,
    // Discurso de ódio
    /\b(odi[oa]r?|nojo)\b/gi,
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
    let sanitizedComment = comment.trim();

    // 1. Verificar padrões urgentes (não sanitiza, apenas sinaliza)
    for (const pattern of this.urgentPatterns) {
      if (pattern.test(sanitizedComment)) {
        flagReasons.push('Conteúdo sensível detectado - requer atenção');
        this.logger.warn(
          `Comentário sinalizado por padrão urgente: ${pattern.source}`,
        );
        break; // Um flag urgente é suficiente
      }
    }

    // 2. Sanitizar palavras bloqueadas
    let wasModified = false;
    for (const pattern of this.blockedPatterns) {
      const matches = sanitizedComment.match(pattern);
      if (matches) {
        sanitizedComment = sanitizedComment.replace(pattern, (match) =>
          '*'.repeat(match.length),
        );
        wasModified = true;
        this.logger.debug(`Palavra filtrada: ${matches.join(', ')}`);
      }
    }

    // 3. Se houve modificação, sinalizar para revisão
    if (wasModified) {
      flagReasons.push('Conteúdo inadequado filtrado');
    }

    // 4. Sanitização básica (XSS prevention)
    sanitizedComment = this.sanitizeHtml(sanitizedComment);

    const isFlagged = flagReasons.length > 0;

    if (isFlagged) {
      this.logger.log(`Comentário sinalizado: ${flagReasons.join(', ')}`);
    }

    return {
      sanitizedComment,
      isFlagged,
      flagReasons: isFlagged ? flagReasons : undefined,
    };
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
