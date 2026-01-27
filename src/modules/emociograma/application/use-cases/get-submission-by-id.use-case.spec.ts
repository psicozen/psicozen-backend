import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { GetSubmissionByIdUseCase } from './get-submission-by-id.use-case';
import {
  IEmociogramaSubmissionRepository,
  EMOCIOGRAMA_SUBMISSION_REPOSITORY,
} from '../../domain/repositories/submission.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { NotFoundException } from '../../../../core/domain/exceptions/not-found.exception';
import { Role } from '../../../roles/domain/enums/role.enum';

describe('GetSubmissionByIdUseCase', () => {
  let useCase: GetSubmissionByIdUseCase;
  let submissionRepository: jest.Mocked<IEmociogramaSubmissionRepository>;
  let userRepository: jest.Mocked<IUserRepository>;

  // Mock data
  const userId = 'user-123';
  const otherUserId = 'user-456';
  const organizationId = 'org-789';
  const submissionId = 'sub-001';

  const createMockSubmission = (
    overrides?: Partial<EmociogramaSubmissionEntity>,
  ): EmociogramaSubmissionEntity => {
    const submission = new EmociogramaSubmissionEntity({
      id: submissionId,
      organizationId,
      userId,
      emotionLevel: 3,
      emotionEmoji: '😌',
      categoryId: 'cat-789',
      isAnonymous: false,
      comment: 'Feeling good today',
      commentFlagged: false,
      submittedAt: new Date('2024-01-15T10:00:00Z'),
      department: 'Engineering',
      team: 'Backend',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      ...overrides,
    });
    return submission;
  };

  beforeEach(async () => {
    const mockSubmissionRepository: Partial<
      jest.Mocked<IEmociogramaSubmissionRepository>
    > = {
      findById: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findByUser: jest.fn(),
      getAggregatedByTimeRange: jest.fn(),
      findSubmissionsAboveThreshold: jest.fn(),
      getMostMotivated: jest.fn(),
      getLeastMotivated: jest.fn(),
      getByDepartment: jest.fn(),
      getByTeam: jest.fn(),
      deleteByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
    };

    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findBySupabaseUserId: jest.fn(),
      existsByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSubmissionByIdUseCase,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockSubmissionRepository,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetSubmissionByIdUseCase>(GetSubmissionByIdUseCase);
    submissionRepository = module.get(EMOCIOGRAMA_SUBMISSION_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
  });

  describe('execute', () => {
    describe('Busca bem-sucedida', () => {
      it('deve retornar submissão quando usuário é o dono', async () => {
        // Arrange
        const mockSubmission = createMockSubmission();
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act
        const result = await useCase.execute(
          submissionId,
          userId,
          organizationId,
          Role.COLABORADOR,
        );

        // Assert
        expect(submissionRepository.findById).toHaveBeenCalledWith(submissionId);
        expect(result).toEqual(mockSubmission);
      });

      it('deve retornar submissão para GESTOR mesmo não sendo o dono', async () => {
        // Arrange
        const mockSubmission = createMockSubmission({ userId: otherUserId });
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act
        const result = await useCase.execute(
          submissionId,
          userId,
          organizationId,
          Role.GESTOR,
        );

        // Assert
        expect(result).toEqual(mockSubmission);
      });

      it('deve retornar submissão para ADMIN mesmo não sendo o dono', async () => {
        // Arrange
        const mockSubmission = createMockSubmission({ userId: otherUserId });
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act
        const result = await useCase.execute(
          submissionId,
          userId,
          organizationId,
          Role.ADMIN,
        );

        // Assert
        expect(result).toEqual(mockSubmission);
      });

      it('deve retornar submissão para SUPER_ADMIN mesmo não sendo o dono', async () => {
        // Arrange
        const mockSubmission = createMockSubmission({ userId: otherUserId });
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act
        const result = await useCase.execute(
          submissionId,
          userId,
          organizationId,
          Role.SUPER_ADMIN,
        );

        // Assert
        expect(result).toEqual(mockSubmission);
      });
    });

    describe('Submissões anônimas', () => {
      it('deve retornar dados completos se é o próprio usuário (mesmo anônimo)', async () => {
        // Arrange
        const mockSubmission = createMockSubmission({ isAnonymous: true });
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act
        const result = await useCase.execute(
          submissionId,
          userId,
          organizationId,
          Role.COLABORADOR,
        );

        // Assert
        expect(result).toEqual(mockSubmission);
        expect((result as EmociogramaSubmissionEntity).userId).toBe(userId);
      });

      it('deve retornar dados mascarados para GESTOR em submissão anônima de outro usuário', async () => {
        // Arrange
        const mockSubmission = createMockSubmission({
          userId: otherUserId,
          isAnonymous: true,
        });
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act
        const result = await useCase.execute(
          submissionId,
          userId,
          organizationId,
          Role.GESTOR,
        );

        // Assert
        expect(result).toHaveProperty('userId', 'anonymous');
      });

      it('deve retornar dados mascarados para ADMIN em submissão anônima de outro usuário', async () => {
        // Arrange
        const mockSubmission = createMockSubmission({
          userId: otherUserId,
          isAnonymous: true,
        });
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act
        const result = await useCase.execute(
          submissionId,
          userId,
          organizationId,
          Role.ADMIN,
        );

        // Assert
        expect(result).toHaveProperty('userId', 'anonymous');
      });
    });

    describe('Erros', () => {
      it('deve lançar NotFoundException quando submissão não existe', async () => {
        // Arrange
        submissionRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(
          useCase.execute(submissionId, userId, organizationId, Role.COLABORADOR),
        ).rejects.toThrow(NotFoundException);
      });

      it('deve lançar ForbiddenException quando submissão é de outra organização', async () => {
        // Arrange
        const mockSubmission = createMockSubmission({
          organizationId: 'other-org-123',
        });
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act & Assert
        await expect(
          useCase.execute(submissionId, userId, organizationId, Role.ADMIN),
        ).rejects.toThrow(ForbiddenException);
      });

      it('deve lançar ForbiddenException quando COLABORADOR tenta ver submissão de outro usuário', async () => {
        // Arrange
        const mockSubmission = createMockSubmission({ userId: otherUserId });
        submissionRepository.findById.mockResolvedValue(mockSubmission);

        // Act & Assert
        await expect(
          useCase.execute(
            submissionId,
            userId,
            organizationId,
            Role.COLABORADOR,
          ),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          useCase.execute(
            submissionId,
            userId,
            organizationId,
            Role.COLABORADOR,
          ),
        ).rejects.toThrow('Você só pode visualizar suas próprias submissões');
      });
    });
  });
});
