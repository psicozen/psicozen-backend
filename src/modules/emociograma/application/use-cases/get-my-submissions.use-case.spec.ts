import { Test, TestingModule } from '@nestjs/testing';
import { GetMySubmissionsUseCase } from './get-my-submissions.use-case';
import {
  IEmociogramaSubmissionRepository,
  EMOCIOGRAMA_SUBMISSION_REPOSITORY,
} from '../../domain/repositories/submission.repository.interface';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';
import type { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';

describe('GetMySubmissionsUseCase', () => {
  let useCase: GetMySubmissionsUseCase;
  let submissionRepository: jest.Mocked<IEmociogramaSubmissionRepository>;

  // Mock data
  const userId = 'user-123';
  const organizationId = 'org-456';

  const mockSubmission = {
    id: 'sub-001',
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
  } as EmociogramaSubmissionEntity;

  const mockPaginatedResult: PaginatedResult<EmociogramaSubmissionEntity> = {
    data: [mockSubmission],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const mockSubmissionRepository: Partial<
      jest.Mocked<IEmociogramaSubmissionRepository>
    > = {
      findByUser: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      getAggregatedByTimeRange: jest.fn(),
      findSubmissionsAboveThreshold: jest.fn(),
      getMostMotivated: jest.fn(),
      getLeastMotivated: jest.fn(),
      getByDepartment: jest.fn(),
      getByTeam: jest.fn(),
      deleteByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMySubmissionsUseCase,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockSubmissionRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetMySubmissionsUseCase>(GetMySubmissionsUseCase);
    submissionRepository = module.get(EMOCIOGRAMA_SUBMISSION_REPOSITORY);
  });

  describe('execute', () => {
    it('deve retornar submissões paginadas do usuário', async () => {
      // Arrange
      const pagination = new PaginationDto();
      pagination.page = 1;
      pagination.limit = 10;
      submissionRepository.findByUser.mockResolvedValue(mockPaginatedResult);

      // Act
      const result = await useCase.execute(userId, organizationId, pagination);

      // Assert
      expect(submissionRepository.findByUser).toHaveBeenCalledWith(
        userId,
        organizationId,
        {
          skip: 0,
          take: 10,
        },
      );
      expect(result).toEqual(mockPaginatedResult);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('deve aplicar skip e take corretamente na paginação', async () => {
      // Arrange
      const pagination = new PaginationDto();
      pagination.page = 2;
      pagination.limit = 5;
      submissionRepository.findByUser.mockResolvedValue({
        ...mockPaginatedResult,
        page: 2,
      });

      // Act
      await useCase.execute(userId, organizationId, pagination);

      // Assert
      expect(submissionRepository.findByUser).toHaveBeenCalledWith(
        userId,
        organizationId,
        {
          skip: 5, // (page 2 - 1) * limit 5
          take: 5,
        },
      );
    });

    it('deve retornar lista vazia quando usuário não tem submissões', async () => {
      // Arrange
      const pagination = new PaginationDto();
      const emptyResult: PaginatedResult<EmociogramaSubmissionEntity> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      submissionRepository.findByUser.mockResolvedValue(emptyResult);

      // Act
      const result = await useCase.execute(userId, organizationId, pagination);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('deve retornar múltiplas páginas corretamente', async () => {
      // Arrange
      const pagination = new PaginationDto();
      pagination.page = 1;
      pagination.limit = 2;
      const secondSubmission = {
        ...mockSubmission,
        id: 'sub-002',
      } as EmociogramaSubmissionEntity;
      const multiPageResult: PaginatedResult<EmociogramaSubmissionEntity> = {
        data: [mockSubmission, secondSubmission],
        total: 5,
        page: 1,
        limit: 2,
        totalPages: 3,
      };
      submissionRepository.findByUser.mockResolvedValue(multiPageResult);

      // Act
      const result = await useCase.execute(userId, organizationId, pagination);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(5);
    });
  });
});
