import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetTeamSubmissionsUseCase } from './get-team-submissions.use-case';
import type { AnonymizedPaginatedResult } from './get-team-submissions.use-case';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { MaskedSubmissionData } from '../../domain/entities/submission.entity';
import type { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';

describe('GetTeamSubmissionsUseCase', () => {
  let useCase: GetTeamSubmissionsUseCase;
  let mockRepository: jest.Mocked<IEmociogramaSubmissionRepository>;

  const organizationId = 'org-123';
  const requesterId = 'requester-456';

  const createMockSubmission = (overrides: Partial<EmociogramaSubmissionEntity> = {}) => {
    const submission = Object.assign(new EmociogramaSubmissionEntity(), {
      id: 'sub-001',
      organizationId,
      userId: 'user-789',
      emotionLevel: 4,
      emotionEmoji: '😊',
      categoryId: 'cat-001',
      isAnonymous: false,
      submittedAt: new Date('2024-01-15T10:00:00Z'),
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      ...overrides,
    });
    return submission;
  };

  const mockSubmissions = [
    createMockSubmission({ id: 'sub-001', userId: 'user-1' }),
    createMockSubmission({ id: 'sub-002', userId: 'user-2', isAnonymous: true }),
    createMockSubmission({ id: 'sub-003', userId: 'user-3' }),
  ];

  const mockPaginatedResult: PaginatedResult<EmociogramaSubmissionEntity> = {
    data: mockSubmissions,
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      existsById: jest.fn(),
      findByUser: jest.fn(),
      getAggregatedByTimeRange: jest.fn(),
      findSubmissionsAboveThreshold: jest.fn(),
      getMostMotivated: jest.fn(),
      getLeastMotivated: jest.fn(),
      getByDepartment: jest.fn(),
      getByTeam: jest.fn(),
      deleteByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
    } as jest.Mocked<IEmociogramaSubmissionRepository>;

    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTeamSubmissionsUseCase,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetTeamSubmissionsUseCase>(GetTeamSubmissionsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute com anonimização (padrão)', () => {
    it('deve retornar submissões anonimizadas por padrão', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      const result = await useCase.execute(organizationId, requesterId, pagination);

      const anonymizedResult = result as AnonymizedPaginatedResult;
      expect(anonymizedResult.data).toBeDefined();
      expect(Array.isArray(anonymizedResult.data)).toBe(true);
    });

    it('deve chamar maskIdentity em cada submissão quando anonymize=true', async () => {
      const submissionWithMask = createMockSubmission();
      const maskSpy = jest.spyOn(submissionWithMask, 'maskIdentity').mockReturnValue({
        id: 'sub-001',
        organizationId,
        userId: 'anonymous',
        emotionLevel: 4,
        emotionEmoji: '😊',
        categoryId: 'cat-001',
        isAnonymous: true,
        commentFlagged: false,
        submittedAt: new Date('2024-01-15T10:00:00Z'),
      });

      mockRepository.findAll.mockResolvedValue({
        data: [submissionWithMask],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const pagination = new PaginationDto();
      await useCase.execute(organizationId, requesterId, pagination, true);

      expect(maskSpy).toHaveBeenCalled();
    });

    it('deve manter estrutura de paginação', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      const result = await useCase.execute(organizationId, requesterId, pagination);

      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('execute sem anonimização', () => {
    it('deve retornar submissões completas quando anonymize=false', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      const result = await useCase.execute(
        organizationId,
        requesterId,
        pagination,
        false,
      );

      const fullResult = result as PaginatedResult<EmociogramaSubmissionEntity>;
      expect(fullResult.data).toEqual(mockSubmissions);
      expect(fullResult.data[0]).toBeInstanceOf(EmociogramaSubmissionEntity);
    });

    it('deve preservar userId original', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      const result = await useCase.execute(
        organizationId,
        requesterId,
        pagination,
        false,
      );

      const fullResult = result as PaginatedResult<EmociogramaSubmissionEntity>;
      expect(fullResult.data[0].userId).toBe('user-1');
      expect(fullResult.data[1].userId).toBe('user-2');
    });
  });

  describe('filtros', () => {
    it('deve aplicar filtro de departamento', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      const filters = { department: 'Engineering' };

      await useCase.execute(organizationId, requesterId, pagination, true, filters);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: 'Engineering',
          }),
        }),
      );
    });

    it('deve aplicar filtro de equipe', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      const filters = { team: 'Backend' };

      await useCase.execute(organizationId, requesterId, pagination, true, filters);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            team: 'Backend',
          }),
        }),
      );
    });

    it('deve aplicar múltiplos filtros', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      const filters = { department: 'Engineering', team: 'Backend' };

      await useCase.execute(organizationId, requesterId, pagination, true, filters);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: 'Engineering',
            team: 'Backend',
          }),
        }),
      );
    });

    it('deve funcionar sem filtros', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();

      await useCase.execute(organizationId, requesterId, pagination);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId },
        }),
      );
    });
  });

  describe('paginação', () => {
    it('deve passar parâmetros de paginação corretos', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      pagination.page = 2;
      pagination.limit = 20;

      await useCase.execute(organizationId, requesterId, pagination);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: pagination.skip,
          take: pagination.take,
        }),
      );
    });

    it('deve ordenar por submittedAt DESC', async () => {
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();

      await useCase.execute(organizationId, requesterId, pagination);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { submittedAt: 'DESC' },
        }),
      );
    });
  });

  describe('tratamento de erros', () => {
    it('deve propagar erro do repositório', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findAll.mockRejectedValue(error);

      const pagination = new PaginationDto();

      await expect(
        useCase.execute(organizationId, requesterId, pagination),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('logging', () => {
    it('deve logar início da busca', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      await useCase.execute(organizationId, requesterId, pagination);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Buscando submissões da organização ${organizationId}`),
      );
    });

    it('deve logar resultados encontrados', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const pagination = new PaginationDto();
      await useCase.execute(organizationId, requesterId, pagination);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Encontradas 3 submissões'),
      );
    });
  });

  describe('estrutura de resposta anonimizada', () => {
    it('deve retornar MaskedSubmissionData com campos corretos', async () => {
      const submissionWithFullMask = createMockSubmission();
      jest.spyOn(submissionWithFullMask, 'maskIdentity').mockReturnValue({
        id: 'sub-001',
        organizationId,
        userId: 'anonymous',
        emotionLevel: 4,
        emotionEmoji: '😊',
        categoryId: 'cat-001',
        isAnonymous: true,
        commentFlagged: false,
        submittedAt: new Date('2024-01-15T10:00:00Z'),
      });

      mockRepository.findAll.mockResolvedValue({
        data: [submissionWithFullMask],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const pagination = new PaginationDto();
      const result = (await useCase.execute(
        organizationId,
        requesterId,
        pagination,
        true,
      )) as AnonymizedPaginatedResult;

      expect(result.data[0]).toHaveProperty('userId');
      expect(result.data[0].userId).toBe('anonymous');
    });
  });
});
