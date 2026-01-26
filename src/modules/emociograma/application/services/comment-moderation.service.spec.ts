import { Test, TestingModule } from '@nestjs/testing';
import {
  CommentModerationService,
  ModerationResult,
} from './comment-moderation.service';

describe('CommentModerationService', () => {
  let service: CommentModerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentModerationService],
    }).compile();

    service = module.get<CommentModerationService>(CommentModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('moderateComment', () => {
    describe('empty/null comments', () => {
      it('should return empty result for null comment', () => {
        const result = service.moderateComment(null as unknown as string);

        expect(result.sanitizedComment).toBe('');
        expect(result.isFlagged).toBe(false);
        expect(result.flagReasons).toBeUndefined();
      });

      it('should return empty result for undefined comment', () => {
        const result = service.moderateComment(undefined as unknown as string);

        expect(result.sanitizedComment).toBe('');
        expect(result.isFlagged).toBe(false);
        expect(result.flagReasons).toBeUndefined();
      });

      it('should return empty result for empty string', () => {
        const result = service.moderateComment('');

        expect(result.sanitizedComment).toBe('');
        expect(result.isFlagged).toBe(false);
        expect(result.flagReasons).toBeUndefined();
      });

      it('should return empty result for whitespace-only string', () => {
        const result = service.moderateComment('   ');

        expect(result.sanitizedComment).toBe('');
        expect(result.isFlagged).toBe(false);
        expect(result.flagReasons).toBeUndefined();
      });
    });

    describe('clean comments', () => {
      it('should return original comment when clean', () => {
        const comment = 'Estou me sentindo bem hoje!';
        const result = service.moderateComment(comment);

        expect(result.sanitizedComment).toBe(comment);
        expect(result.isFlagged).toBe(false);
        expect(result.flagReasons).toBeUndefined();
      });

      it('should trim whitespace from clean comments', () => {
        const result = service.moderateComment('  Bom dia  ');

        expect(result.sanitizedComment).toBe('Bom dia');
        expect(result.isFlagged).toBe(false);
      });

      it('should preserve comment with normal punctuation', () => {
        const comment = 'Hoje foi um dia produtivo. Terminei todas as tarefas!';
        const result = service.moderateComment(comment);

        expect(result.sanitizedComment).toBe(comment);
        expect(result.isFlagged).toBe(false);
      });
    });

    describe('blocked patterns (offensive words)', () => {
      it('should sanitize "idiota" and flag comment', () => {
        const result = service.moderateComment('Meu chefe é um idiota');

        expect(result.sanitizedComment).toContain('******');
        expect(result.sanitizedComment).not.toContain('idiota');
        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain('Conteúdo inadequado filtrado');
      });

      it('should sanitize "estúpido" and flag comment', () => {
        const result = service.moderateComment('Isso é estúpido');

        expect(result.sanitizedComment).toContain('*******');
        expect(result.sanitizedComment).not.toContain('estúpido');
        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain('Conteúdo inadequado filtrado');
      });

      it('should sanitize "imbecil" and flag comment', () => {
        const result = service.moderateComment('Que imbecil!');

        expect(result.sanitizedComment).toContain('*******');
        expect(result.sanitizedComment).not.toContain('imbecil');
        expect(result.isFlagged).toBe(true);
      });

      it('should sanitize multiple offensive words', () => {
        const result = service.moderateComment('Esse idiota é um imbecil');

        expect(result.sanitizedComment).not.toContain('idiota');
        expect(result.sanitizedComment).not.toContain('imbecil');
        expect(result.isFlagged).toBe(true);
        // Should have asterisks for both words
        const asteriskCount = (result.sanitizedComment.match(/\*/g) || [])
          .length;
        expect(asteriskCount).toBeGreaterThanOrEqual(12); // 6 + 7 = 13 minimum
      });

      it('should be case-insensitive for blocked words', () => {
        const result1 = service.moderateComment('IDIOTA');
        const result2 = service.moderateComment('Idiota');
        const result3 = service.moderateComment('iDiOtA');

        expect(result1.isFlagged).toBe(true);
        expect(result2.isFlagged).toBe(true);
        expect(result3.isFlagged).toBe(true);
        expect(result1.sanitizedComment).not.toMatch(/idiota/i);
        expect(result2.sanitizedComment).not.toMatch(/idiota/i);
        expect(result3.sanitizedComment).not.toMatch(/idiota/i);
      });

      it('should preserve non-offensive parts of the comment', () => {
        const result = service.moderateComment(
          'Bom dia, mas esse idiota arruinou tudo',
        );

        expect(result.sanitizedComment).toContain('Bom dia');
        expect(result.sanitizedComment).toContain('arruinou tudo');
        expect(result.sanitizedComment).not.toContain('idiota');
      });
    });

    describe('urgent patterns (mental health/harassment)', () => {
      it('should flag and sanitize "suicida" (blocked pattern)', () => {
        const comment = 'Ele é suicida';
        const result = service.moderateComment(comment);

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain('Conteúdo inadequado filtrado');
        // "suicida" matches blockedPatterns and gets sanitized
        expect(result.sanitizedComment).not.toContain('suicida');
        expect(result.sanitizedComment).toContain('*******');
      });

      it('should flag "me machucar" as urgent', () => {
        const comment = 'Quero me machucar';
        const result = service.moderateComment(comment);

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain(
          'Conteúdo sensível detectado - requer atenção',
        );
      });

      it('should flag "acabar com tudo" as urgent', () => {
        const comment = 'Vou acabar com tudo';
        const result = service.moderateComment(comment);

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain(
          'Conteúdo sensível detectado - requer atenção',
        );
      });

      it('should flag "assédio" as urgent', () => {
        const comment = 'Estou sofrendo assédio no trabalho';
        const result = service.moderateComment(comment);

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain(
          'Conteúdo sensível detectado - requer atenção',
        );
      });

      it('should flag "abuso" as urgent', () => {
        const comment = 'Meu gerente comete abuso';
        const result = service.moderateComment(comment);

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain(
          'Conteúdo sensível detectado - requer atenção',
        );
      });

      it('should flag "autolesão" as urgent', () => {
        const comment = 'Tenho pensamentos de autolesão';
        const result = service.moderateComment(comment);

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain(
          'Conteúdo sensível detectado - requer atenção',
        );
      });
    });

    describe('HTML sanitization (XSS prevention)', () => {
      it('should escape < and > characters', () => {
        const result = service.moderateComment('<script>alert("xss")</script>');

        expect(result.sanitizedComment).not.toContain('<');
        expect(result.sanitizedComment).not.toContain('>');
        expect(result.sanitizedComment).toContain('&lt;');
        expect(result.sanitizedComment).toContain('&gt;');
      });

      it('should escape double quotes', () => {
        const result = service.moderateComment('Disse "olá"');

        expect(result.sanitizedComment).not.toContain('"');
        expect(result.sanitizedComment).toContain('&quot;');
      });

      it('should escape single quotes', () => {
        const result = service.moderateComment("Disse 'olá'");

        expect(result.sanitizedComment).not.toContain("'");
        expect(result.sanitizedComment).toContain('&#x27;');
      });

      it('should escape all HTML special characters together', () => {
        const result = service.moderateComment(
          '<div class="test">\'text\'</div>',
        );

        expect(result.sanitizedComment).toBe(
          '&lt;div class=&quot;test&quot;&gt;&#x27;text&#x27;&lt;/div&gt;',
        );
      });

      it('should not flag clean text with HTML escaping', () => {
        const result = service.moderateComment('2 < 3 e 5 > 4');

        expect(result.isFlagged).toBe(false);
        expect(result.sanitizedComment).toContain('&lt;');
        expect(result.sanitizedComment).toContain('&gt;');
      });
    });

    describe('combined scenarios', () => {
      it('should handle both blocked words and HTML characters', () => {
        const result = service.moderateComment('<b>idiota</b>');

        expect(result.isFlagged).toBe(true);
        expect(result.sanitizedComment).toContain('&lt;');
        expect(result.sanitizedComment).toContain('&gt;');
        expect(result.sanitizedComment).not.toContain('idiota');
      });

      it('should handle urgent patterns with blocked words', () => {
        const result = service.moderateComment(
          'Esse idiota me faz querer acabar com tudo',
        );

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain(
          'Conteúdo sensível detectado - requer atenção',
        );
        expect(result.flagReasons).toContain('Conteúdo inadequado filtrado');
        expect(result.sanitizedComment).not.toContain('idiota');
      });

      it('should include multiple flag reasons when applicable', () => {
        // Comment with both: offensive word (imbecil) + urgent pattern (assédio)
        const result = service.moderateComment(
          'Esse imbecil está praticando assédio',
        );

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toBeDefined();
        // Should have both: 'Conteúdo sensível detectado' AND 'Conteúdo inadequado filtrado'
        expect(result.flagReasons.length).toBeGreaterThanOrEqual(2);
        expect(result.flagReasons).toContain(
          'Conteúdo sensível detectado - requer atenção',
        );
        expect(result.flagReasons).toContain('Conteúdo inadequado filtrado');
      });
    });

    describe('edge cases', () => {
      it('should handle very long comments', () => {
        const longComment = 'Bom dia! '.repeat(1000);
        const result = service.moderateComment(longComment);

        expect(result.isFlagged).toBe(false);
        expect(result.sanitizedComment.length).toBeGreaterThan(0);
      });

      it('should handle comments with only special characters', () => {
        const result = service.moderateComment('!@#$%^&*()');

        expect(result.isFlagged).toBe(false);
        expect(result.sanitizedComment).toBeDefined();
      });

      it('should handle comments with unicode characters', () => {
        const result = service.moderateComment('Estou feliz 😊 hoje!');

        expect(result.isFlagged).toBe(false);
        expect(result.sanitizedComment).toContain('😊');
      });

      it('should handle comments with line breaks', () => {
        const result = service.moderateComment('Linha 1\nLinha 2\nLinha 3');

        expect(result.isFlagged).toBe(false);
        expect(result.sanitizedComment).toContain('\n');
      });

      it('should handle word boundaries correctly (not partial matches)', () => {
        // "estudo" contains "estud" which should NOT match "estúpido"
        const result = service.moderateComment('Estou no estudo de caso');

        expect(result.isFlagged).toBe(false);
        expect(result.sanitizedComment).toBe('Estou no estudo de caso');
      });
    });

    describe('return type validation', () => {
      it('should return ModerationResult interface structure', () => {
        const result: ModerationResult =
          service.moderateComment('Test comment');

        expect(result).toHaveProperty('sanitizedComment');
        expect(result).toHaveProperty('isFlagged');
        expect(typeof result.sanitizedComment).toBe('string');
        expect(typeof result.isFlagged).toBe('boolean');
      });

      it('should include flagReasons only when flagged', () => {
        const cleanResult = service.moderateComment('Bom dia');
        const flaggedResult = service.moderateComment('Esse idiota');

        expect(cleanResult.flagReasons).toBeUndefined();
        expect(flaggedResult.flagReasons).toBeDefined();
        expect(Array.isArray(flaggedResult.flagReasons)).toBe(true);
      });
    });
  });
});
