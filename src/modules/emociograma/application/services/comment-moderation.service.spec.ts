import { Test, TestingModule } from '@nestjs/testing';
import {
  CommentModerationService,
  ModerationResult,
  ModerationReasonType,
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

      it('should include reasonTypes only when flagged', () => {
        const cleanResult = service.moderateComment('Bom dia');
        const flaggedResult = service.moderateComment('Esse idiota');

        expect(cleanResult.reasonTypes).toBeUndefined();
        expect(flaggedResult.reasonTypes).toBeDefined();
        expect(Array.isArray(flaggedResult.reasonTypes)).toBe(true);
        expect(flaggedResult.reasonTypes).toContain('inappropriate_language');
      });
    });

    describe('excessive caps detection (gritaria)', () => {
      it('should detect and sanitize 10+ consecutive caps', () => {
        const result = service.moderateComment('Isso é AAAAAAAAAAAA demais');

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain(
          'Texto com caps excessivos sanitizado',
        );
        expect(result.reasonTypes).toContain('excessive_caps');
        // Should convert to first letter + lowercase
        expect(result.sanitizedComment).not.toContain('AAAAAAAAAAAA');
      });

      it('should sanitize excessive caps preserving first letter', () => {
        const result = service.moderateComment('HELLOWORLD123');

        expect(result.isFlagged).toBe(true);
        expect(result.sanitizedComment).toContain('Helloworld');
      });

      it('should not flag 9 or fewer consecutive caps', () => {
        const result = service.moderateComment('Isso é AAAAAAAAA ok');

        // 9 caps should not trigger
        expect(result.reasonTypes?.includes('excessive_caps')).toBeFalsy();
      });

      it('should handle multiple excessive caps segments', () => {
        const result = service.moderateComment(
          'AAAAAAAAAAAAAA e BBBBBBBBBBBBBB',
        );

        expect(result.isFlagged).toBe(true);
        expect(result.reasonTypes).toContain('excessive_caps');
        expect(result.sanitizedComment).not.toContain('AAAAAAAAAAAAAA');
        expect(result.sanitizedComment).not.toContain('BBBBBBBBBBBBBB');
      });
    });

    describe('spam detection (repeated characters)', () => {
      it('should detect and sanitize 6+ repeated characters', () => {
        const result = service.moderateComment('Hellooooooo world');

        expect(result.isFlagged).toBe(true);
        expect(result.flagReasons).toContain(
          'Spam de caracteres detectado e sanitizado',
        );
        expect(result.reasonTypes).toContain('spam');
        // Should reduce to max 3 repetitions
        expect(result.sanitizedComment).toContain('ooo');
        expect(result.sanitizedComment).not.toContain('oooooo');
      });

      it('should reduce repeated characters to maximum of 3', () => {
        const result = service.moderateComment('Nãoooooooooo');

        expect(result.isFlagged).toBe(true);
        expect(result.sanitizedComment).toBe('Nãooo');
      });

      it('should not flag 5 or fewer repeated characters', () => {
        const result = service.moderateComment('Nãooooo'); // 5 o's

        // 5 repetitions should not trigger spam
        expect(result.reasonTypes?.includes('spam')).toBeFalsy();
      });

      it('should handle multiple spam segments', () => {
        // Note: Spam pattern is case-sensitive, so "Aaaaaaaaaa" only matches
        // the 9 lowercase 'a's after the capital 'A', resulting in "Aaaa"
        // For all-lowercase input, both get reduced to 3
        const result = service.moderateComment('aaaaaaaaaa e bbbbbbbbbb');

        expect(result.isFlagged).toBe(true);
        expect(result.reasonTypes).toContain('spam');
        // Both should be reduced to 3
        expect(result.sanitizedComment).toBe('aaa e bbb');
      });

      it('should handle repeated punctuation as spam', () => {
        const result = service.moderateComment('Olá!!!!!!!!!');

        expect(result.isFlagged).toBe(true);
        expect(result.reasonTypes).toContain('spam');
        expect(result.sanitizedComment).toBe('Olá!!!');
      });
    });

    describe('personal info detection (LGPD compliance)', () => {
      describe('email detection', () => {
        it('should detect and remove email addresses', () => {
          const result = service.moderateComment(
            'Meu email é teste@exemplo.com',
          );

          expect(result.isFlagged).toBe(true);
          expect(result.flagReasons).toContain(
            'Informação pessoal removida (proteção LGPD)',
          );
          expect(result.reasonTypes).toContain('personal_info');
          expect(result.sanitizedComment).not.toContain('teste@exemplo.com');
          expect(result.sanitizedComment).toContain(
            '[INFORMAÇÃO PESSOAL REMOVIDA]',
          );
        });

        it('should detect various email formats', () => {
          const emails = [
            'user@domain.com',
            'user.name@domain.com.br',
            'user-name@sub.domain.org',
          ];

          emails.forEach((email) => {
            const result = service.moderateComment(`Contato: ${email}`);
            expect(result.reasonTypes).toContain('personal_info');
            expect(result.sanitizedComment).not.toContain(email);
          });
        });
      });

      describe('phone detection', () => {
        it('should detect Brazilian phone numbers with DDD', () => {
          const result = service.moderateComment('Meu telefone é 11 98765-4321');

          expect(result.isFlagged).toBe(true);
          expect(result.reasonTypes).toContain('personal_info');
          expect(result.sanitizedComment).toContain(
            '[INFORMAÇÃO PESSOAL REMOVIDA]',
          );
        });

        it('should detect phone with parentheses', () => {
          const result = service.moderateComment('Liga pra (11) 98765-4321');

          expect(result.isFlagged).toBe(true);
          expect(result.reasonTypes).toContain('personal_info');
        });

        it('should detect phone without separators', () => {
          const result = service.moderateComment('Celular: 11987654321');

          expect(result.isFlagged).toBe(true);
          expect(result.reasonTypes).toContain('personal_info');
        });
      });

      describe('CPF detection', () => {
        it('should detect CPF in standard format (XXX.XXX.XXX-XX)', () => {
          const result = service.moderateComment('CPF: 123.456.789-00');

          expect(result.isFlagged).toBe(true);
          expect(result.reasonTypes).toContain('personal_info');
          expect(result.sanitizedComment).not.toContain('123.456.789-00');
          expect(result.sanitizedComment).toContain(
            '[INFORMAÇÃO PESSOAL REMOVIDA]',
          );
        });

        it('should detect CPF without formatting (11 digits)', () => {
          const result = service.moderateComment('Meu CPF é 12345678900');

          expect(result.isFlagged).toBe(true);
          expect(result.reasonTypes).toContain('personal_info');
        });
      });

      describe('multiple personal info', () => {
        it('should remove multiple personal info items', () => {
          const result = service.moderateComment(
            'Email: teste@test.com, CPF: 123.456.789-00',
          );

          expect(result.isFlagged).toBe(true);
          expect(result.reasonTypes).toContain('personal_info');
          // Should have two replacements
          const matches = result.sanitizedComment.match(
            /\[INFORMAÇÃO PESSOAL REMOVIDA\]/g,
          );
          expect(matches?.length).toBeGreaterThanOrEqual(2);
        });
      });
    });

    describe('reasonTypes field', () => {
      it('should include inappropriate_language for blocked words', () => {
        const result = service.moderateComment('Esse idiota');

        expect(result.reasonTypes).toContain('inappropriate_language');
      });

      it('should include urgent_content for urgent patterns', () => {
        const result = service.moderateComment('Quero me machucar');

        expect(result.reasonTypes).toContain('urgent_content');
      });

      it('should include excessive_caps for caps abuse', () => {
        const result = service.moderateComment('AAAAAAAAAAAAAAA');

        expect(result.reasonTypes).toContain('excessive_caps');
      });

      it('should include spam for repeated characters', () => {
        const result = service.moderateComment('Hellooooooooooo');

        expect(result.reasonTypes).toContain('spam');
      });

      it('should include personal_info for PII', () => {
        const result = service.moderateComment('Email: test@test.com');

        expect(result.reasonTypes).toContain('personal_info');
      });

      it('should include multiple reasonTypes when applicable', () => {
        // Comment with inappropriate language + personal info
        const result = service.moderateComment(
          'Esse idiota, meu email é test@test.com',
        );

        expect(result.reasonTypes).toContain('inappropriate_language');
        expect(result.reasonTypes).toContain('personal_info');
        expect(result.reasonTypes?.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('new combined scenarios', () => {
      it('should handle spam + personal info together', () => {
        const result = service.moderateComment(
          'Oiiiiiiiiii, meu email é test@test.com',
        );

        expect(result.isFlagged).toBe(true);
        expect(result.reasonTypes).toContain('spam');
        expect(result.reasonTypes).toContain('personal_info');
        expect(result.sanitizedComment).toContain('Oiii');
        expect(result.sanitizedComment).toContain(
          '[INFORMAÇÃO PESSOAL REMOVIDA]',
        );
      });

      it('should handle all moderation types in one comment', () => {
        const result = service.moderateComment(
          'AAAAAAAAAAAA idiota!!!!!!!!!! meu email é test@test.com',
        );

        expect(result.isFlagged).toBe(true);
        // Should have: excessive_caps, inappropriate_language, spam, personal_info
        expect(result.reasonTypes).toContain('excessive_caps');
        expect(result.reasonTypes).toContain('inappropriate_language');
        expect(result.reasonTypes).toContain('spam');
        expect(result.reasonTypes).toContain('personal_info');
      });
    });
  });
});
