import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';
import {
  EmociogramaAlertEntity,
  CreateAlertData,
  AlertSeverity,
} from './alert.entity';
import { EmociogramaSubmissionEntity } from './submission.entity';

describe('EmociogramaAlertEntity', () => {
  const validAlertData: CreateAlertData = {
    organizationId: 'org-uuid-123',
    submissionId: 'submission-uuid-456',
    alertType: 'threshold_exceeded',
    severity: 'high',
    message: 'Colaborador reportou estado emocional negativo',
  };

  describe('create()', () => {
    it('deve criar um alerta com dados válidos', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      expect(alert.organizationId).toBe('org-uuid-123');
      expect(alert.submissionId).toBe('submission-uuid-456');
      expect(alert.alertType).toBe('threshold_exceeded');
      expect(alert.severity).toBe('high');
      expect(alert.message).toBe(
        'Colaborador reportou estado emocional negativo',
      );
      expect(alert.isResolved).toBe(false);
      expect(alert.notifiedUsers).toEqual([]);
      expect(alert.createdAt).toBeInstanceOf(Date);
      expect(alert.updatedAt).toBeInstanceOf(Date);
    });

    it('deve criar alerta com alertType pattern_detected', () => {
      const data: CreateAlertData = {
        ...validAlertData,
        alertType: 'pattern_detected',
      };

      const alert = EmociogramaAlertEntity.create(data);

      expect(alert.alertType).toBe('pattern_detected');
    });

    it('deve criar alerta com todas as severidades válidas', () => {
      const severities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

      severities.forEach((severity) => {
        const alert = EmociogramaAlertEntity.create({
          ...validAlertData,
          severity,
        });
        expect(alert.severity).toBe(severity);
      });
    });

    describe('validação de organizationId', () => {
      it('deve lançar ValidationException quando organizationId estiver vazio', () => {
        const data: CreateAlertData = {
          ...validAlertData,
          organizationId: '',
        };

        expect(() => EmociogramaAlertEntity.create(data)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaAlertEntity.create(data);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect(
            (error as ValidationException).errors.organizationId,
          ).toBeDefined();
        }
      });

      it('deve lançar ValidationException quando organizationId for apenas espaços', () => {
        const data: CreateAlertData = {
          ...validAlertData,
          organizationId: '   ',
        };

        expect(() => EmociogramaAlertEntity.create(data)).toThrow(
          ValidationException,
        );
      });
    });

    describe('validação de submissionId', () => {
      it('deve lançar ValidationException quando submissionId estiver vazio', () => {
        const data: CreateAlertData = {
          ...validAlertData,
          submissionId: '',
        };

        expect(() => EmociogramaAlertEntity.create(data)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaAlertEntity.create(data);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect(
            (error as ValidationException).errors.submissionId,
          ).toBeDefined();
        }
      });
    });

    describe('validação de alertType', () => {
      it('deve lançar ValidationException quando alertType for inválido', () => {
        const data = {
          ...validAlertData,
          alertType: 'invalid_type' as CreateAlertData['alertType'],
        };

        expect(() => EmociogramaAlertEntity.create(data)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaAlertEntity.create(data);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect((error as ValidationException).errors.alertType).toBeDefined();
        }
      });
    });

    describe('validação de severity', () => {
      it('deve lançar ValidationException quando severity for inválida', () => {
        const data = {
          ...validAlertData,
          severity: 'invalid_severity' as AlertSeverity,
        };

        expect(() => EmociogramaAlertEntity.create(data)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaAlertEntity.create(data);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect((error as ValidationException).errors.severity).toBeDefined();
        }
      });
    });

    describe('validação de message', () => {
      it('deve lançar ValidationException quando message estiver vazia', () => {
        const data: CreateAlertData = {
          ...validAlertData,
          message: '',
        };

        expect(() => EmociogramaAlertEntity.create(data)).toThrow(
          ValidationException,
        );

        try {
          EmociogramaAlertEntity.create(data);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationException);
          expect((error as ValidationException).errors.message).toBeDefined();
        }
      });
    });

    it('deve lançar ValidationException com múltiplos erros', () => {
      const data = {
        organizationId: '',
        submissionId: '',
        alertType: 'invalid' as CreateAlertData['alertType'],
        severity: 'invalid' as AlertSeverity,
        message: '',
      };

      try {
        EmociogramaAlertEntity.create(data);
        fail('Deveria ter lançado ValidationException');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        const validationError = error as ValidationException;
        expect(Object.keys(validationError.errors).length).toBeGreaterThan(1);
      }
    });
  });

  describe('fromSubmission()', () => {
    const createMockSubmission = (
      emotionLevel: number,
      options: { department?: string; team?: string } = {},
    ): EmociogramaSubmissionEntity => {
      const submission = new EmociogramaSubmissionEntity({
        id: 'submission-uuid-789',
        organizationId: 'org-uuid-123',
        userId: 'user-uuid-456',
        emotionLevel,
        emotionEmoji:
          EmociogramaSubmissionEntity.getEmojiForLevel(emotionLevel),
        categoryId: 'cat-uuid',
        isAnonymous: false,
        commentFlagged: false,
        submittedAt: new Date(),
        department: options.department,
        team: options.team,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return submission;
    };

    it('deve criar alerta a partir de submissão com severidade medium (nível 6)', () => {
      const submission = createMockSubmission(6);

      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.organizationId).toBe('org-uuid-123');
      expect(alert.submissionId).toBe('submission-uuid-789');
      expect(alert.alertType).toBe('threshold_exceeded');
      expect(alert.severity).toBe('medium');
      expect(alert.isResolved).toBe(false);
    });

    it('deve criar alerta com severidade high (nível 7)', () => {
      const submission = createMockSubmission(7);

      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.severity).toBe('high');
    });

    it('deve criar alerta com severidade high (nível 8)', () => {
      const submission = createMockSubmission(8);

      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.severity).toBe('high');
    });

    it('deve criar alerta com severidade critical (nível 9)', () => {
      const submission = createMockSubmission(9);

      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.severity).toBe('critical');
    });

    it('deve criar alerta com severidade critical (nível 10)', () => {
      const submission = createMockSubmission(10);

      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.severity).toBe('critical');
    });

    it('deve gerar mensagem com equipe quando disponível', () => {
      const submission = createMockSubmission(8, { team: 'Backend' });

      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.message).toContain('Equipe: Backend');
      expect(alert.message).toContain('Estressado 😣');
      expect(alert.message).toContain('Nível 8/10');
    });

    it('deve gerar mensagem com departamento quando equipe não disponível', () => {
      const submission = createMockSubmission(7, { department: 'Engenharia' });

      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.message).toContain('Departamento: Engenharia');
      expect(alert.message).toContain('Triste 😢');
    });

    it('deve gerar mensagem sem localização quando nenhuma disponível', () => {
      const submission = createMockSubmission(9);

      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.message).toContain('Localização não especificada');
      expect(alert.message).toContain('Ansioso 😟');
    });

    it('deve lançar ValidationException quando submissão não tiver ID', () => {
      const submission = new EmociogramaSubmissionEntity({
        organizationId: 'org-uuid',
        userId: 'user-uuid',
        emotionLevel: 8,
        emotionEmoji: '😣',
        categoryId: 'cat-uuid',
        isAnonymous: false,
        commentFlagged: false,
        submittedAt: new Date(),
      });
      // Não define submission.id

      expect(() => EmociogramaAlertEntity.fromSubmission(submission)).toThrow(
        ValidationException,
      );
    });
  });

  describe('calculateSeverity()', () => {
    it('deve retornar low para níveis abaixo de 6', () => {
      expect(EmociogramaAlertEntity.calculateSeverity(1)).toBe('low');
      expect(EmociogramaAlertEntity.calculateSeverity(5)).toBe('low');
    });

    it('deve retornar medium para nível 6', () => {
      expect(EmociogramaAlertEntity.calculateSeverity(6)).toBe('medium');
    });

    it('deve retornar high para níveis 7 e 8', () => {
      expect(EmociogramaAlertEntity.calculateSeverity(7)).toBe('high');
      expect(EmociogramaAlertEntity.calculateSeverity(8)).toBe('high');
    });

    it('deve retornar critical para níveis 9 e 10', () => {
      expect(EmociogramaAlertEntity.calculateSeverity(9)).toBe('critical');
      expect(EmociogramaAlertEntity.calculateSeverity(10)).toBe('critical');
    });
  });

  describe('generateAlertMessage()', () => {
    it('deve gerar mensagem correta para cada nível emocional', () => {
      const testCases = [
        { level: 6, expectedEmoji: 'Cansado 😫' },
        { level: 7, expectedEmoji: 'Triste 😢' },
        { level: 8, expectedEmoji: 'Estressado 😣' },
        { level: 9, expectedEmoji: 'Ansioso 😟' },
        { level: 10, expectedEmoji: 'Muito triste 😞' },
      ];

      testCases.forEach(({ level, expectedEmoji }) => {
        const submission = new EmociogramaSubmissionEntity({
          id: 'sub-id',
          organizationId: 'org-id',
          userId: 'user-id',
          emotionLevel: level,
          emotionEmoji: '😣',
          categoryId: 'cat-id',
          isAnonymous: false,
          commentFlagged: false,
          submittedAt: new Date(),
        });

        const message = EmociogramaAlertEntity.generateAlertMessage(submission);

        expect(message).toContain(expectedEmoji);
        expect(message).toContain(`Nível ${level}/10`);
      });
    });

    it('deve usar "Negativo" como fallback para níveis não mapeados', () => {
      const submission = new EmociogramaSubmissionEntity({
        id: 'sub-id',
        organizationId: 'org-id',
        userId: 'user-id',
        emotionLevel: 5, // Não está no mapa de descrições
        emotionEmoji: '😕',
        categoryId: 'cat-id',
        isAnonymous: false,
        commentFlagged: false,
        submittedAt: new Date(),
      });

      const message = EmociogramaAlertEntity.generateAlertMessage(submission);

      expect(message).toContain('Negativo');
    });
  });

  describe('resolve()', () => {
    it('deve marcar o alerta como resolvido', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      alert.resolve('admin-uuid-123', 'Conversei com o colaborador');

      expect(alert.isResolved).toBe(true);
      expect(alert.resolvedAt).toBeInstanceOf(Date);
      expect(alert.resolvedBy).toBe('admin-uuid-123');
      expect(alert.resolutionNotes).toBe('Conversei com o colaborador');
    });

    it('deve resolver sem notas', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      alert.resolve('admin-uuid-123');

      expect(alert.isResolved).toBe(true);
      expect(alert.resolvedBy).toBe('admin-uuid-123');
      expect(alert.resolutionNotes).toBeUndefined();
    });

    it('deve atualizar updatedAt ao resolver', () => {
      const alert = new EmociogramaAlertEntity({
        ...validAlertData,
        isResolved: false,
        notifiedUsers: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const previousUpdatedAt = alert.updatedAt;

      alert.resolve('admin-uuid');

      expect(alert.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });

    it('deve lançar ValidationException quando resolvedBy estiver vazio', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      expect(() => alert.resolve('')).toThrow(ValidationException);
    });

    it('deve lançar ValidationException quando resolvedBy for apenas espaços', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      expect(() => alert.resolve('   ')).toThrow(ValidationException);
    });

    it('deve remover espaços extras das notas', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      alert.resolve('admin-uuid', '  Notas com espaços  ');

      expect(alert.resolutionNotes).toBe('Notas com espaços');
    });
  });

  describe('recordNotification()', () => {
    it('deve registrar usuários notificados', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);
      const userIds = ['user-1', 'user-2', 'user-3'];

      alert.recordNotification(userIds);

      expect(alert.notifiedUsers).toEqual(userIds);
      expect(alert.notificationSentAt).toBeInstanceOf(Date);
    });

    it('deve atualizar updatedAt ao registrar notificação', () => {
      const alert = new EmociogramaAlertEntity({
        ...validAlertData,
        isResolved: false,
        notifiedUsers: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const previousUpdatedAt = alert.updatedAt;

      alert.recordNotification(['user-1']);

      expect(alert.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });

    it('deve lançar ValidationException quando lista de usuários estiver vazia', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      expect(() => alert.recordNotification([])).toThrow(ValidationException);
    });

    it('deve criar cópia do array de usuários', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);
      const userIds = ['user-1', 'user-2'];

      alert.recordNotification(userIds);

      // Modificar array original não deve afetar a entidade
      userIds.push('user-3');

      expect(alert.notifiedUsers).toHaveLength(2);
    });
  });

  describe('isPending()', () => {
    it('deve retornar true para alerta não resolvido', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      expect(alert.isPending()).toBe(true);
    });

    it('deve retornar false para alerta resolvido', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);
      alert.resolve('admin-uuid');

      expect(alert.isPending()).toBe(false);
    });
  });

  describe('wasNotificationSent()', () => {
    it('deve retornar false quando nenhuma notificação foi enviada', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);

      expect(alert.wasNotificationSent()).toBe(false);
    });

    it('deve retornar true após notificação ser registrada', () => {
      const alert = EmociogramaAlertEntity.create(validAlertData);
      alert.recordNotification(['user-1']);

      expect(alert.wasNotificationSent()).toBe(true);
    });
  });

  describe('constructor', () => {
    it('deve criar instância com partial data', () => {
      const alert = new EmociogramaAlertEntity({
        id: 'alert-uuid-123',
        organizationId: 'org-uuid',
        submissionId: 'sub-uuid',
        alertType: 'threshold_exceeded',
        severity: 'critical',
        message: 'Test message',
        isResolved: true,
        resolvedBy: 'admin-uuid',
      });

      expect(alert.id).toBe('alert-uuid-123');
      expect(alert.isResolved).toBe(true);
      expect(alert.notifiedUsers).toEqual([]);
    });

    it('deve herdar comportamento de BaseEntity', () => {
      const alert = new EmociogramaAlertEntity({
        organizationId: 'org-uuid',
        submissionId: 'sub-uuid',
        alertType: 'threshold_exceeded',
        severity: 'high',
        message: 'Test',
        isResolved: false,
        notifiedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(alert.isDeleted()).toBe(false);

      alert.markAsDeleted();

      expect(alert.isDeleted()).toBe(true);
      expect(alert.deletedAt).toBeInstanceOf(Date);
    });

    it('deve inicializar notifiedUsers como array vazio se não fornecido', () => {
      const alert = new EmociogramaAlertEntity({
        organizationId: 'org-uuid',
        submissionId: 'sub-uuid',
        alertType: 'threshold_exceeded',
        severity: 'high',
        message: 'Test',
        isResolved: false,
      });

      expect(alert.notifiedUsers).toEqual([]);
    });
  });

  describe('cenários de integração', () => {
    it('deve processar fluxo completo de alerta', () => {
      // 1. Criar submissão com nível crítico
      const submission = EmociogramaSubmissionEntity.create({
        organizationId: 'org-uuid',
        userId: 'user-uuid',
        emotionLevel: 9,
        categoryId: 'cat-uuid',
        isAnonymous: false,
        department: 'Vendas',
        team: 'Enterprise',
      });
      submission.id = 'submission-uuid';

      // 2. Gerar alerta a partir da submissão
      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      expect(alert.severity).toBe('critical');
      expect(alert.alertType).toBe('threshold_exceeded');
      expect(alert.isPending()).toBe(true);

      // 3. Registrar notificações
      alert.recordNotification(['admin-1', 'admin-2']);

      expect(alert.wasNotificationSent()).toBe(true);
      expect(alert.notifiedUsers).toHaveLength(2);

      // 4. Resolver o alerta
      alert.resolve(
        'admin-1',
        'Conversei com o colaborador, situação resolvida',
      );

      expect(alert.isPending()).toBe(false);
      expect(alert.isResolved).toBe(true);
      expect(alert.resolvedBy).toBe('admin-1');
    });
  });
});
