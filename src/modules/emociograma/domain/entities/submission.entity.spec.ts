import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';
import {
  EmociogramaSubmissionEntity,
  CreateEmociogramaSubmissionParams,
} from './submission.entity';

describe('EmociogramaSubmissionEntity', () => {
  const validParams: CreateEmociogramaSubmissionParams = {
    organizationId: 'org-uuid-123',
    userId: 'user-uuid-456',
    emotionLevel: 3,
    categoryId: 'category-uuid-789',
    isAnonymous: false,
    comment: 'Me sinto bem hoje',
    department: 'Engenharia',
    team: 'Backend',
  };

  describe('create()', () => {
    it('deve criar uma submissão com dados válidos', () => {
      const submission = EmociogramaSubmissionEntity.create(validParams);

      expect(submission.organizationId).toBe('org-uuid-123');
      expect(submission.userId).toBe('user-uuid-456');
      expect(submission.emotionLevel).toBe(3);
      expect(submission.emotionEmoji).toBe('😌');
      expect(submission.categoryId).toBe('category-uuid-789');
      expect(submission.isAnonymous).toBe(false);
      expect(submission.comment).toBe('Me sinto bem hoje');
      expect(submission.commentFlagged).toBe(false);
      expect(submission.department).toBe('Engenharia');
      expect(submission.team).toBe('Backend');
      expect(submission.submittedAt).toBeInstanceOf(Date);
      expect(submission.createdAt).toBeInstanceOf(Date);
      expect(submission.updatedAt).toBeInstanceOf(Date);
    });

    it('deve criar uma submissão sem campos opcionais', () => {
      const params: CreateEmociogramaSubmissionParams = {
        organizationId: 'org-uuid-123',
        userId: 'user-uuid-456',
        emotionLevel: 5,
        categoryId: 'category-uuid-789',
        isAnonymous: true,
      };

      const submission = EmociogramaSubmissionEntity.create(params);

      expect(submission.comment).toBeUndefined();
      expect(submission.department).toBeUndefined();
      expect(submission.team).toBeUndefined();
      expect(submission.isAnonymous).toBe(true);
    });

    it('deve remover espaços extras do comentário', () => {
      const params: CreateEmociogramaSubmissionParams = {
        ...validParams,
        comment: '  Comentário com espaços  ',
      };

      const submission = EmociogramaSubmissionEntity.create(params);

      expect(submission.comment).toBe('Comentário com espaços');
    });

    it('deve remover espaços extras do department e team', () => {
      const params: CreateEmociogramaSubmissionParams = {
        ...validParams,
        department: '  RH  ',
        team: '  Recrutamento  ',
      };

      const submission = EmociogramaSubmissionEntity.create(params);

      expect(submission.department).toBe('RH');
      expect(submission.team).toBe('Recrutamento');
    });

    it('deve criar uma submissão anônima', () => {
      const params: CreateEmociogramaSubmissionParams = {
        ...validParams,
        isAnonymous: true,
      };

      const submission = EmociogramaSubmissionEntity.create(params);

      expect(submission.isAnonymous).toBe(true);
    });

    describe('validação de organizationId', () => {
      it('deve lançar ValidationException quando organizationId estiver vazio', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          organizationId: '',
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaSubmissionEntity.create(params);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect(
            (error as ValidationException).errors.organizationId,
          ).toBeDefined();
        }
      });

      it('deve lançar ValidationException quando organizationId for somente espaços', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          organizationId: '   ',
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );
      });
    });

    describe('validação de userId', () => {
      it('deve lançar ValidationException quando userId estiver vazio', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          userId: '',
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaSubmissionEntity.create(params);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect((error as ValidationException).errors.userId).toBeDefined();
        }
      });
    });

    describe('validação de categoryId', () => {
      it('deve lançar ValidationException quando categoryId estiver vazio', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          categoryId: '',
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaSubmissionEntity.create(params);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect(
            (error as ValidationException).errors.categoryId,
          ).toBeDefined();
        }
      });
    });

    describe('validação de emotionLevel', () => {
      it('deve lançar ValidationException quando emotionLevel for menor que 1', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          emotionLevel: 0,
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaSubmissionEntity.create(params);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect(
            (error as ValidationException).errors.emotionLevel,
          ).toBeDefined();
        }
      });

      it('deve lançar ValidationException quando emotionLevel for maior que 10', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          emotionLevel: 11,
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );
      });

      it('deve lançar ValidationException quando emotionLevel for negativo', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          emotionLevel: -1,
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );
      });

      it('deve lançar ValidationException quando emotionLevel não for inteiro', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          emotionLevel: 3.5,
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );
      });

      it('deve aceitar todos os níveis válidos (1-10)', () => {
        for (let level = 1; level <= 10; level++) {
          const params: CreateEmociogramaSubmissionParams = {
            ...validParams,
            emotionLevel: level,
          };

          const submission = EmociogramaSubmissionEntity.create(params);
          expect(submission.emotionLevel).toBe(level);
        }
      });
    });

    describe('validação de comentário', () => {
      it('deve lançar ValidationException quando comentário exceder 1000 caracteres', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          comment: 'A'.repeat(1001),
        };

        expect(() => EmociogramaSubmissionEntity.create(params)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaSubmissionEntity.create(params);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect((error as ValidationException).errors.comment).toBeDefined();
        }
      });

      it('deve aceitar comentário com exatamente 1000 caracteres', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          comment: 'A'.repeat(1000),
        };

        const submission = EmociogramaSubmissionEntity.create(params);
        expect(submission.comment?.length).toBe(1000);
      });

      it('deve aceitar comentário vazio (opcional)', () => {
        const params: CreateEmociogramaSubmissionParams = {
          ...validParams,
          comment: '',
        };

        const submission = EmociogramaSubmissionEntity.create(params);
        expect(submission.comment).toBeUndefined();
      });
    });

    it('deve lançar ValidationException com múltiplos erros', () => {
      const params = {
        organizationId: '',
        userId: '',
        emotionLevel: 15,
        categoryId: '',
        isAnonymous: false,
        comment: 'A'.repeat(1001),
      } as CreateEmociogramaSubmissionParams;

      try {
        EmociogramaSubmissionEntity.create(params);
        fail('Deveria ter lançado ValidationException');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        const validationError = error as ValidationException;
        expect(Object.keys(validationError.errors).length).toBeGreaterThan(1);
      }
    });
  });

  describe('getEmojiForLevel()', () => {
    it('deve retornar 😄 para nível 1 (muito feliz)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(1)).toBe('😄');
    });

    it('deve retornar 🙂 para nível 2 (feliz)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(2)).toBe('🙂');
    });

    it('deve retornar 😌 para nível 3 (satisfeito)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(3)).toBe('😌');
    });

    it('deve retornar 😐 para nível 4 (neutro)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(4)).toBe('😐');
    });

    it('deve retornar 😕 para nível 5 (levemente irritado)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(5)).toBe('😕');
    });

    it('deve retornar 😫 para nível 6 (cansado - limite de alerta)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(6)).toBe('😫');
    });

    it('deve retornar 😢 para nível 7 (triste)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(7)).toBe('😢');
    });

    it('deve retornar 😣 para nível 8 (estressado)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(8)).toBe('😣');
    });

    it('deve retornar 😟 para nível 9 (ansioso)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(9)).toBe('😟');
    });

    it('deve retornar 😞 para nível 10 (muito triste)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(10)).toBe('😞');
    });

    it('deve retornar 😐 para nível inválido (fallback)', () => {
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(0)).toBe('😐');
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(11)).toBe('😐');
      expect(EmociogramaSubmissionEntity.getEmojiForLevel(-1)).toBe('😐');
    });
  });

  describe('shouldTriggerAlert()', () => {
    it('deve retornar false para níveis 1-5 (emoções positivas)', () => {
      for (let level = 1; level <= 5; level++) {
        const submission = EmociogramaSubmissionEntity.create({
          ...validParams,
          emotionLevel: level,
        });
        expect(submission.shouldTriggerAlert()).toBe(false);
      }
    });

    it('deve retornar true para níveis 6-10 (emoções negativas)', () => {
      for (let level = 6; level <= 10; level++) {
        const submission = EmociogramaSubmissionEntity.create({
          ...validParams,
          emotionLevel: level,
        });
        expect(submission.shouldTriggerAlert()).toBe(true);
      }
    });

    it('deve retornar true para nível 6 (limite exato)', () => {
      const submission = EmociogramaSubmissionEntity.create({
        ...validParams,
        emotionLevel: 6,
      });
      expect(submission.shouldTriggerAlert()).toBe(true);
    });

    it('deve retornar false para nível 5 (abaixo do limite)', () => {
      const submission = EmociogramaSubmissionEntity.create({
        ...validParams,
        emotionLevel: 5,
      });
      expect(submission.shouldTriggerAlert()).toBe(false);
    });
  });

  describe('maskIdentity()', () => {
    it('deve mascarar userId para submissões anônimas', () => {
      const submission = EmociogramaSubmissionEntity.create({
        ...validParams,
        isAnonymous: true,
      });
      submission.id = 'submission-uuid-123';

      const masked = submission.maskIdentity();

      expect(masked.userId).toBe('anonymous');
      expect(masked.id).toBe('submission-uuid-123');
    });

    it('deve preservar department e team para submissões anônimas', () => {
      const submission = EmociogramaSubmissionEntity.create({
        ...validParams,
        isAnonymous: true,
        department: 'Engenharia',
        team: 'Backend',
      });

      const masked = submission.maskIdentity();

      expect(masked.department).toBe('Engenharia');
      expect(masked.team).toBe('Backend');
    });

    it('deve preservar comment para submissões anônimas', () => {
      const submission = EmociogramaSubmissionEntity.create({
        ...validParams,
        isAnonymous: true,
        comment: 'Comentário importante',
      });

      const masked = submission.maskIdentity();

      expect(masked.comment).toBe('Comentário importante');
    });

    it('deve preservar userId para submissões não-anônimas', () => {
      const submission = EmociogramaSubmissionEntity.create({
        ...validParams,
        isAnonymous: false,
      });

      const masked = submission.maskIdentity();

      expect(masked.userId).toBe('user-uuid-456');
    });

    it('deve retornar todos os campos esperados', () => {
      const submission = EmociogramaSubmissionEntity.create(validParams);
      submission.id = 'submission-uuid-123';

      const masked = submission.maskIdentity();

      expect(masked).toHaveProperty('id');
      expect(masked).toHaveProperty('organizationId');
      expect(masked).toHaveProperty('userId');
      expect(masked).toHaveProperty('emotionLevel');
      expect(masked).toHaveProperty('emotionEmoji');
      expect(masked).toHaveProperty('categoryId');
      expect(masked).toHaveProperty('isAnonymous');
      expect(masked).toHaveProperty('comment');
      expect(masked).toHaveProperty('commentFlagged');
      expect(masked).toHaveProperty('submittedAt');
      expect(masked).toHaveProperty('department');
      expect(masked).toHaveProperty('team');
    });
  });

  describe('flagComment()', () => {
    it('deve marcar o comentário como flagged', () => {
      const submission = EmociogramaSubmissionEntity.create(validParams);

      expect(submission.commentFlagged).toBe(false);

      submission.flagComment();

      expect(submission.commentFlagged).toBe(true);
    });

    it('deve atualizar updatedAt quando flagging', () => {
      const submission = new EmociogramaSubmissionEntity({
        ...validParams,
        commentFlagged: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const previousUpdatedAt = submission.updatedAt;

      submission.flagComment();

      expect(submission.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });
  });

  describe('unflagComment()', () => {
    it('deve remover a flag do comentário', () => {
      const submission = new EmociogramaSubmissionEntity({
        ...validParams,
        commentFlagged: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(submission.commentFlagged).toBe(true);

      submission.unflagComment();

      expect(submission.commentFlagged).toBe(false);
    });

    it('deve atualizar updatedAt quando unflagging', () => {
      const submission = new EmociogramaSubmissionEntity({
        ...validParams,
        commentFlagged: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const previousUpdatedAt = submission.updatedAt;

      submission.unflagComment();

      expect(submission.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });
  });

  describe('constructor', () => {
    it('deve criar instância com partial data', () => {
      const submission = new EmociogramaSubmissionEntity({
        id: 'submission-uuid-123',
        organizationId: 'org-uuid',
        userId: 'user-uuid',
        emotionLevel: 5,
        emotionEmoji: '😕',
        categoryId: 'cat-uuid',
        isAnonymous: false,
        commentFlagged: false,
        submittedAt: new Date(),
      });

      expect(submission.id).toBe('submission-uuid-123');
      expect(submission.organizationId).toBe('org-uuid');
      expect(submission.emotionLevel).toBe(5);
    });

    it('deve herdar comportamento de BaseEntity', () => {
      const submission = new EmociogramaSubmissionEntity({
        organizationId: 'org-uuid',
        userId: 'user-uuid',
        emotionLevel: 3,
        emotionEmoji: '😌',
        categoryId: 'cat-uuid',
        isAnonymous: false,
        commentFlagged: false,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(submission.isDeleted()).toBe(false);

      submission.markAsDeleted();

      expect(submission.isDeleted()).toBe(true);
      expect(submission.deletedAt).toBeInstanceOf(Date);
    });

    it('deve permitir touch() para atualizar updatedAt', () => {
      const submission = new EmociogramaSubmissionEntity({
        organizationId: 'org-uuid',
        userId: 'user-uuid',
        emotionLevel: 3,
        emotionEmoji: '😌',
        categoryId: 'cat-uuid',
        isAnonymous: false,
        commentFlagged: false,
        submittedAt: new Date(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const previousUpdatedAt = submission.updatedAt;

      submission.touch();

      expect(submission.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });
  });

  describe('cenários de integração', () => {
    it('deve processar fluxo completo de submissão anônima com alerta', () => {
      // Criar submissão anônima com nível de alerta
      const submission = EmociogramaSubmissionEntity.create({
        organizationId: 'org-uuid',
        userId: 'user-uuid-sensitive',
        emotionLevel: 8, // Estressado - deve disparar alerta
        categoryId: 'cat-uuid',
        isAnonymous: true,
        comment: 'Estou muito sobrecarregado com o trabalho',
        department: 'Vendas',
        team: 'Enterprise',
      });

      // Verificar que dispara alerta
      expect(submission.shouldTriggerAlert()).toBe(true);

      // Verificar emoji correto
      expect(submission.emotionEmoji).toBe('😣');

      // Mascarar identidade
      const masked = submission.maskIdentity();

      // Verificar que userId está oculto
      expect(masked.userId).toBe('anonymous');

      // Verificar que informações de agregação estão preservadas
      expect(masked.department).toBe('Vendas');
      expect(masked.team).toBe('Enterprise');
      expect(masked.comment).toBe('Estou muito sobrecarregado com o trabalho');
    });

    it('deve processar fluxo de moderação de comentário', () => {
      const submission = EmociogramaSubmissionEntity.create(validParams);

      // Comentário inicialmente não sinalizado
      expect(submission.commentFlagged).toBe(false);

      // Sinalizar para moderação
      submission.flagComment();
      expect(submission.commentFlagged).toBe(true);

      // Após revisão, remover sinalização
      submission.unflagComment();
      expect(submission.commentFlagged).toBe(false);
    });
  });
});
